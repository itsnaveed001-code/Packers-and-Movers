import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createInvoiceSchema } from '@/lib/validation';
import {
  createOrUpdateInvoice,
  loadInvoiceWithBookingById,
  sendInvoiceEmail,
} from '@/lib/invoicesServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  return user;
}

// POST /api/admin/bookings/[id]/invoice
//
// Create-or-replace the active invoice for this booking, then email it.
// Idempotent: if a non-paid invoice already exists, its line items and
// notes are updated and `resent` is true. Paid / cash_received invoices
// can't be edited from here — that's a separate reconciliation problem.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id: bookingId } = await params;
  if (!uuidRegex.test(bookingId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const result = await createOrUpdateInvoice(supabase, bookingId, parsed.data);
  if (!result.ok) {
    const status =
      result.error === 'booking_not_found'
        ? 404
        : result.error === 'booking_cancelled' ||
            result.error === 'paid_invoice_exists'
          ? 409
          : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  // Re-load with the booking join so the email has customer + service.
  const withBooking = await loadInvoiceWithBookingById(supabase, result.invoice.id);
  if (withBooking) sendInvoiceEmail(withBooking, withBooking.booking);

  return NextResponse.json(
    { ok: true, invoice: result.invoice, resent: result.resent },
    { status: result.resent ? 200 : 201 },
  );
}
