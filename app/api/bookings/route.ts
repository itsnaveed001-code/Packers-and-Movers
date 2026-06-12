import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createVerifiedBookingSchema } from '@/lib/validation';
import { generateReferenceCode } from '@/lib/utils';
import { BUSINESS } from '@/lib/constants';
import { verifyVerificationToken } from '@/lib/otp';
import {
  MAX_ACTIVE_BOOKINGS_PER_EMAIL,
  underActiveBookingCap,
} from '@/lib/bookingPolicy';
import { computeCustomPrice, loadRateCard } from '@/lib/customPricing';
import type { CustomResources } from '@/types/database';
import { sendEmail } from '@/lib/email/send';
import {
  adminNotificationEmail,
  customerConfirmationEmail,
  bookingTemplateParams,
} from '@/lib/email/templates';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseDateUTC(yyyyMmDd: string): Date {
  const [y, mo, d] = yyyyMmDd.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d));
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = createVerifiedBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Email ownership proof: a token issued by /api/bookings/otp/verify,
  // bound to this exact email, within the last 15 minutes.
  if (
    !verifyVerificationToken(data.verification_token, data.customer_email, [
      'booking',
    ])
  ) {
    return NextResponse.json({ error: 'email_not_verified' }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();

  // Load availability settings + service in parallel
  const [availRes, serviceRes] = await Promise.all([
    supabase.from('availability_settings').select('*').maybeSingle(),
    supabase
      .from('services')
      .select('id, name, duration_hours, is_active, is_custom')
      .eq('id', data.service_id)
      .maybeSingle(),
  ]);

  if (availRes.error || !availRes.data) {
    return NextResponse.json({ error: 'no_settings' }, { status: 500 });
  }
  const avail = availRes.data;

  if (serviceRes.error || !serviceRes.data || !serviceRes.data.is_active) {
    return NextResponse.json({ error: 'service_not_found' }, { status: 400 });
  }
  const service = serviceRes.data;

  // Validate the date/time against availability rules
  const today = new Date();
  const todayUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const bookingDate = parseDateUTC(data.booking_date);
  const maxDate = new Date(
    todayUTC.getTime() + avail.advance_booking_days * 24 * 60 * 60 * 1000,
  );

  if (bookingDate.getTime() < todayUTC.getTime()) {
    return NextResponse.json({ error: 'date_in_past' }, { status: 400 });
  }
  if (bookingDate.getTime() > maxDate.getTime()) {
    return NextResponse.json({ error: 'date_too_far' }, { status: 400 });
  }

  // Blocked?
  const { data: blocked } = await supabase
    .from('blocked_dates')
    .select('date')
    .eq('date', data.booking_date)
    .maybeSingle();
  if (blocked) {
    return NextResponse.json({ error: 'date_blocked' }, { status: 400 });
  }

  // Working day?
  const dow = bookingDate.getUTCDay();
  if (!avail.working_days.includes(dow)) {
    return NextResponse.json({ error: 'non_working_day' }, { status: 400 });
  }

  // Within working hours?
  const start = toMinutes(avail.working_hours_start);
  const end = toMinutes(avail.working_hours_end);
  const t = toMinutes(data.booking_time);
  if (t < start || t + avail.slot_duration_minutes > end) {
    return NextResponse.json({ error: 'time_out_of_hours' }, { status: 400 });
  }

  // Minimum notice
  const slotInstant = new Date(
    `${data.booking_date}T${data.booking_time}:00+05:30`,
  ).getTime();
  const noticeMs = avail.minimum_notice_hours * 60 * 60 * 1000;
  if (slotInstant - Date.now() < noticeMs) {
    return NextResponse.json({ error: 'too_soon' }, { status: 400 });
  }

  // Capacity check
  const { data: existing, error: existingErr } = await supabase
    .from('bookings')
    .select('id')
    .eq('booking_date', data.booking_date)
    .eq('booking_time', data.booking_time)
    .neq('status', 'cancelled');

  if (existingErr) {
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }
  if ((existing?.length ?? 0) >= avail.max_concurrent_bookings_per_slot) {
    return NextResponse.json({ error: 'slot_taken' }, { status: 409 });
  }

  // Soft cap: multiple bookings are allowed; only past N active
  // (pending/confirmed) bookings for this email do we ask the customer to
  // manage existing ones first. OTP + send rate limits are the real guard.
  const { count: activeCount, error: activeErr } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .ilike('customer_email', data.customer_email)
    .in('status', ['pending', 'confirmed']);
  if (activeErr) {
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }
  if (!underActiveBookingCap(activeCount ?? 0)) {
    return NextResponse.json(
      {
        error: 'too_many_active_bookings',
        limit: MAX_ACTIVE_BOOKINGS_PER_EMAIL,
        manageUrl: '/booking-status',
      },
      { status: 429 },
    );
  }

  // Custom move: persist the resource selections with an indicative price
  // from the rate card; the customer's estimated hours drive the duration.
  let customResources: CustomResources | null = null;
  let durationHours = service.duration_hours;
  if (service.is_custom) {
    if (!data.custom_resources) {
      return NextResponse.json({ error: 'custom_resources_required' }, { status: 400 });
    }
    const rateCard = await loadRateCard(supabase);
    const price = computeCustomPrice(data.custom_resources, rateCard);
    if (price == null) {
      return NextResponse.json({ error: 'invalid_vehicle' }, { status: 400 });
    }
    customResources = {
      ...data.custom_resources,
      indicative_price_paise: price,
    };
    durationHours = data.custom_resources.hours;
  }

  // Insert with retry on reference code collision (vanishingly rare but cheap)
  let reference_code = generateReferenceCode();
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: insertedRows, error: insertErr } = await supabase
      .from('bookings')
      .insert({
        reference_code,
        service_id: data.service_id,
        booking_date: data.booking_date,
        booking_time: data.booking_time,
        duration_hours: durationHours,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email,
        pickup_address: data.pickup_address,
        pickup_city: data.pickup_city,
        pickup_pincode: data.pickup_pincode,
        dropoff_address: data.dropoff_address,
        dropoff_city: data.dropoff_city,
        dropoff_pincode: data.dropoff_pincode,
        notes: data.notes || null,
        status: 'pending',
        email_verified: true,
        custom_resources: customResources,
      })
      .select('id, reference_code')
      .single();

    if (!insertErr && insertedRows) {
      // Fire-and-forget emails. Don't block on them; log if they fail.
      // Falls back to the business inbox so notifications work once RESEND_API_KEY is set.
      const adminEmail = process.env.ADMIN_EMAIL || BUSINESS.email;
      void (async () => {
        try {
          const emailData = {
            reference_code: insertedRows.reference_code,
            service_name: service.name,
            booking_date: data.booking_date,
            booking_time: data.booking_time,
            customer_name: data.customer_name,
            customer_phone: data.customer_phone,
            customer_email: data.customer_email,
            pickup_address: data.pickup_address,
            pickup_city: data.pickup_city,
            pickup_pincode: data.pickup_pincode,
            dropoff_address: data.dropoff_address,
            dropoff_city: data.dropoff_city,
            dropoff_pincode: data.dropoff_pincode,
            notes: data.notes ?? null,
          };
          if (adminEmail) {
            const t = adminNotificationEmail(emailData);
            const templateIdRaw = process.env.BREVO_ADMIN_TEMPLATE_ID;
            const templateId = templateIdRaw ? Number.parseInt(templateIdRaw, 10) : NaN;
            await sendEmail({
              to: adminEmail,
              subject: t.subject,
              html: t.html, // fallback when no template id / Resend provider
              replyTo: data.customer_email,
              templateId: Number.isFinite(templateId) ? templateId : undefined,
              params: bookingTemplateParams(emailData),
            });
          }
          const c = customerConfirmationEmail(emailData);
          await sendEmail({
            to: data.customer_email,
            subject: c.subject,
            html: c.html,
            replyTo: adminEmail,
          });
        } catch (err) {
          console.error('[bookings] email dispatch failed:', err);
        }
      })();

      return NextResponse.json(
        { reference_code: insertedRows.reference_code },
        { status: 201 },
      );
    }

    // 23505 = unique_violation. Check if it was the reference_code
    // (we'd retry) vs. some other unique constraint (we wouldn't).
    if (insertErr?.code === '23505' && insertErr.message?.includes('reference_code')) {
      reference_code = generateReferenceCode();
      continue;
    }

    console.error('[bookings] insert failed:', insertErr);
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
}

export async function GET(req: NextRequest) {
  // Admin only — checked via Supabase session cookie.
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const validStatuses = new Set([
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
  ] as const);
  type BookingStatusValue = typeof validStatuses extends Set<infer T> ? T : never;

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from('bookings')
    .select('*, service:services(name, slug)')
    .order('booking_date', { ascending: false })
    .order('booking_time', { ascending: false })
    .limit(200);

  if (status && validStatuses.has(status as BookingStatusValue)) {
    query = query.eq('status', status as BookingStatusValue);
  }
  if (from) query = query.gte('booking_date', from);
  if (to) query = query.lte('booking_date', to);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
  return NextResponse.json({ bookings: data ?? [] });
}
