'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, MessageCircle, Mail, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { StatusBadge } from './StatusBadge';
import { formatTimeLabel, whatsappUrl } from '@/lib/utils';
import {
  BOOKING_STATUSES,
  STATUS_LABELS,
  type BookingStatus,
} from '@/lib/constants';
import type { Booking, Service } from '@/types/database';

type DetailBooking = Booking & { service: Pick<Service, 'name' | 'slug'> | null };

// DB stores HH:MM:SS but <input type="time"> wants HH:MM.
function trimSeconds(t: string): string {
  return t.length >= 5 ? t.slice(0, 5) : t;
}

const DEPOSIT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  refund_failed: 'Refund failed — retry manually',
};

const RESCHEDULE_ERROR_MESSAGES: Record<string, string> = {
  date_in_past: "Can't reschedule into the past.",
  date_too_far: 'Date is beyond the advance-booking window in Settings.',
  date_blocked: 'That date is blocked (holiday / capacity out).',
  non_working_day: 'That day of the week is not a working day in Settings.',
  time_out_of_hours: 'Time is outside working hours in Settings.',
  slot_taken: 'That slot is already at max capacity.',
  incomplete_reschedule: 'Pick both a date and a time.',
  no_settings: 'Working-hours settings are missing. Set them under Settings.',
};

export function BookingDetail({ booking }: { booking: DetailBooking }) {
  const router = useRouter();
  const { show } = useToast();

  const [status, setStatus] = React.useState<BookingStatus>(booking.status);
  const [notes, setNotes] = React.useState<string>(booking.admin_notes ?? '');
  const [bookingDate, setBookingDate] = React.useState<string>(
    booking.booking_date,
  );
  const [bookingTime, setBookingTime] = React.useState<string>(
    trimSeconds(booking.booking_time),
  );
  const [priceRupees, setPriceRupees] = React.useState<string>(
    booking.final_price == null ? '' : String(booking.final_price / 100),
  );
  const [paid, setPaid] = React.useState<boolean>(booking.payment_received);
  const [paymentMethod, setPaymentMethod] = React.useState<string>(
    booking.payment_method ?? '',
  );
  const [saving, setSaving] = React.useState(false);

  const rescheduled =
    bookingDate !== booking.booking_date ||
    bookingTime !== trimSeconds(booking.booking_time);

  const initialPriceStr =
    booking.final_price == null ? '' : String(booking.final_price / 100);
  const financeDirty =
    priceRupees !== initialPriceStr ||
    paid !== booking.payment_received ||
    (paymentMethod || '') !== (booking.payment_method ?? '');

  const dirty =
    status !== booking.status ||
    (notes || '') !== (booking.admin_notes ?? '') ||
    rescheduled ||
    financeDirty;

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        status,
        admin_notes: notes,
      };
      if (rescheduled) {
        body.booking_date = bookingDate;
        body.booking_time = bookingTime;
      }
      if (financeDirty) {
        if (priceRupees.trim() === '') {
          body.final_price = null;
        } else {
          const rupees = Number.parseFloat(priceRupees);
          if (Number.isFinite(rupees) && rupees >= 0) {
            body.final_price = Math.round(rupees * 100);
          }
        }
        body.payment_received = paid;
        body.payment_method = paymentMethod;
      }
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        const description =
          errBody.message ||
          (errBody.error && RESCHEDULE_ERROR_MESSAGES[errBody.error]) ||
          'Please try again.';
        show({
          variant: 'error',
          title: "Couldn't save",
          description,
        });
        return;
      }
      show({
        variant: 'success',
        title: rescheduled ? 'Rescheduled' : 'Saved',
      });
      router.refresh();
    } catch {
      show({
        variant: 'error',
        title: "Couldn't save",
        description: 'Network error. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  const phoneHref = `tel:${booking.customer_phone.replace(/\s/g, '')}`;
  const waHref = whatsappUrl(`Hi ${booking.customer_name.split(' ')[0]}! About your booking ${booking.reference_code}. `);
  const mailHref = `mailto:${booking.customer_email}`;

  return (
    <div className="container max-w-4xl py-6 sm:py-8">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to bookings
      </Link>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-sm font-semibold text-brand-700">
            {booking.reference_code}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {booking.service?.name ?? 'Booking'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(booking.booking_date), 'EEEE, d MMM yyyy')} ·{' '}
            {formatTimeLabel(booking.booking_time)}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="space-y-6 p-6">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Customer
              </h2>
              <div className="mt-3 space-y-1">
                <p className="text-base font-medium">{booking.customer_name}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <a
                    href={phoneHref}
                    className="inline-flex items-center gap-1.5 text-brand-700 hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {booking.customer_phone}
                  </a>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-700 hover:underline"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                  <a
                    href={mailHref}
                    className="inline-flex items-center gap-1.5 text-brand-700 hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <Block title="Pickup">
                <div className="flex gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="text-sm">
                    {booking.pickup_address}
                    <br />
                    {booking.pickup_city} — {booking.pickup_pincode}
                  </div>
                </div>
              </Block>
              <Block title="Drop-off">
                <div className="flex gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="text-sm">
                    {booking.dropoff_address}
                    <br />
                    {booking.dropoff_city} — {booking.dropoff_pincode}
                  </div>
                </div>
              </Block>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              <Field label="Duration" value={`${booking.duration_hours}h estimate`} />
              <Field
                label="Created"
                value={format(new Date(booking.created_at), 'd MMM yyyy, p')}
              />
              <Field
                label="Last updated"
                value={format(new Date(booking.updated_at), 'd MMM yyyy, p')}
              />
            </section>

            {booking.notes && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Customer notes
                </h2>
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-secondary/50 p-3 text-sm">
                  {booking.notes}
                </p>
              </section>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as BookingStatus)}>
                <SelectTrigger id="status" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm font-medium">Reschedule</p>
              <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="booking_date" className="text-xs text-muted-foreground">
                    Date
                  </Label>
                  <Input
                    id="booking_date"
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="mt-1"
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div>
                  <Label htmlFor="booking_time" className="text-xs text-muted-foreground">
                    Time
                  </Label>
                  <Input
                    id="booking_time"
                    type="time"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              {rescheduled && (
                <p className="mt-1.5 text-xs text-amber-700">
                  Saving will move this booking. The customer is not auto-notified — call them.
                </p>
              )}
            </div>

            {booking.payment_status && (
              <div>
                <p className="text-sm font-medium">Online deposit</p>
                <div className="mt-1.5 space-y-1.5 rounded-lg border bg-secondary/30 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Status
                    </span>
                    <span
                      className={
                        booking.payment_status === 'paid' ||
                        booking.payment_status === 'refunded'
                          ? 'font-medium text-emerald-700'
                          : booking.payment_status === 'refund_failed'
                            ? 'font-medium text-amber-700'
                            : 'font-medium text-muted-foreground'
                      }
                    >
                      {DEPOSIT_STATUS_LABELS[booking.payment_status] ??
                        booking.payment_status}
                    </span>
                  </div>
                  {booking.deposit_amount_inr != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Amount
                      </span>
                      <span className="font-medium">₹{booking.deposit_amount_inr}</span>
                    </div>
                  )}
                  {booking.razorpay_payment_id && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Payment id
                      </p>
                      <p className="break-all font-mono text-xs">
                        {booking.razorpay_payment_id}
                      </p>
                    </div>
                  )}
                  {booking.razorpay_order_id && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Order id
                      </p>
                      <p className="break-all font-mono text-xs">
                        {booking.razorpay_order_id}
                      </p>
                    </div>
                  )}
                  {booking.refund_id && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Refund id
                      </p>
                      <p className="break-all font-mono text-xs">{booking.refund_id}</p>
                      {booking.refunded_at && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(booking.refunded_at), 'd MMM yyyy, p')}
                        </p>
                      )}
                    </div>
                  )}
                  {booking.payment_status === 'refund_failed' && (
                    <p className="text-xs text-amber-700">
                      Automatic refund failed — issue it manually from the Razorpay
                      dashboard (refund.processed webhook will update this status).
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-medium">Finance</p>
              <div className="mt-1.5 space-y-2">
                <div>
                  <Label htmlFor="final_price" className="text-xs text-muted-foreground">
                    Final price (₹)
                  </Label>
                  <Input
                    id="final_price"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    placeholder="e.g. 5000"
                    value={priceRupees}
                    onChange={(e) => setPriceRupees(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="payment_method" className="text-xs text-muted-foreground">
                    Payment method
                  </Label>
                  <Select
                    value={paymentMethod || 'none'}
                    onValueChange={(v) => setPaymentMethod(v === 'none' ? '' : v)}
                  >
                    <SelectTrigger id="payment_method" className="mt-1">
                      <SelectValue placeholder="Not recorded" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not recorded</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm hover:bg-secondary/50">
                  <input
                    type="checkbox"
                    checked={paid}
                    onChange={(e) => setPaid(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-emerald-600"
                  />
                  <span className="flex-1">Payment received</span>
                  {booking.paid_at && paid && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(booking.paid_at), 'd MMM, p')}
                    </span>
                  )}
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Admin notes</Label>
              <Textarea
                id="notes"
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Private notes for your team…"
                className="mt-1.5"
              />
            </div>

            <Button onClick={save} disabled={!dirty || saving} className="w-full">
              {saving ? 'Saving…' : dirty ? 'Save changes' : 'Up to date'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-secondary/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
