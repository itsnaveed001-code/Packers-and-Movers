'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { StepIndicator, type Step } from './StepIndicator';
import { ServicePicker } from './ServicePicker';
import { BookingDatePicker } from './BookingDatePicker';
import { SlotPicker } from './SlotPicker';
import { CustomerForm, type CustomerFormValues } from './CustomerForm';
import type { Service } from '@/types/database';
import { formatTimeLabel } from '@/lib/utils';

const STEPS: Step[] = [
  { id: 1, label: 'Service' },
  { id: 2, label: 'Date' },
  { id: 3, label: 'Time' },
  { id: 4, label: 'Details' },
  { id: 5, label: 'Review' },
];

type AvailabilityConfig = {
  workingDays: number[];
  blockedDates: string[];
  advanceBookingDays: number;
};

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function BookingFlow({
  services,
  availability,
}: {
  services: Service[];
  availability: AvailabilityConfig;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show } = useToast();

  // Preselect from ?service=slug
  const initialServiceId = React.useMemo(() => {
    const slug = searchParams.get('service');
    if (slug) {
      const found = services.find((s) => s.slug === slug);
      if (found) return found.id;
    }
    return services[0]?.id ?? null;
  }, [searchParams, services]);

  const [step, setStep] = React.useState<number>(initialServiceId ? 1 : 1);
  const [serviceId, setServiceId] = React.useState<string | null>(initialServiceId);
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [time, setTime] = React.useState<string | null>(null);
  const [customer, setCustomer] = React.useState<CustomerFormValues | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const selectedService = services.find((s) => s.id === serviceId) ?? null;
  const isoSelectedDate = date ? isoDate(date) : null;

  function next() {
    setStep((s) => Math.min(s + 1, 5));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 1));
  }

  function selectService(id: string) {
    setServiceId(id);
    // Reset time if service changes — the slot landscape may differ.
    setTime(null);
  }

  function selectDate(d: Date | undefined) {
    setDate(d);
    setTime(null); // changing date invalidates time
    if (d) next();
  }

  function selectTime(t: string) {
    setTime(t);
    next();
  }

  function handleCustomerSubmit(values: CustomerFormValues) {
    setCustomer(values);
    next();
  }

  async function confirmBooking() {
    if (!serviceId || !isoSelectedDate || !time || !customer) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          booking_date: isoSelectedDate,
          booking_time: time,
          ...customer,
        }),
      });

      if (res.status === 201) {
        const body = (await res.json()) as { reference_code: string };
        router.push(`/booking-confirmed?ref=${encodeURIComponent(body.reference_code)}`);
        return;
      }

      if (res.status === 409) {
        // Slot taken — kick back to slot picker with a fresh fetch.
        setTime(null);
        setStep(3);
        show({
          variant: 'error',
          title: 'That slot was just taken',
          description: 'Please pick a different time.',
        });
        return;
      }

      const body = (await res.json().catch(() => ({}))) as { error?: string };
      show({
        variant: 'error',
        title: "Couldn't complete booking",
        description: body.error
          ? `Reason: ${body.error.replace(/_/g, ' ')}`
          : 'Please try again in a moment.',
      });
    } catch {
      show({
        variant: 'error',
        title: 'Network error',
        description: 'Please check your connection and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 rounded-2xl border bg-white p-4 sm:p-5 shadow-sm">
        <StepIndicator steps={STEPS} current={step} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && 'Choose a service'}
            {step === 2 && 'Pick a date'}
            {step === 3 && 'Pick a time'}
            {step === 4 && 'Your details'}
            {step === 5 && 'Review & confirm'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {step === 1 && (
            <>
              <ServicePicker
                services={services}
                selectedId={serviceId}
                onSelect={selectService}
              />
              <div className="flex justify-end">
                <Button onClick={next} disabled={!serviceId}>
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <BookingDatePicker
                selected={date}
                onSelect={selectDate}
                blockedDates={availability.blockedDates}
                workingDays={availability.workingDays}
                maxAdvanceDays={availability.advanceBookingDays}
              />
              <div className="flex justify-between">
                <Button variant="outline" onClick={back}>
                  Back
                </Button>
                <Button onClick={next} disabled={!date}>
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <SlotPicker
                date={isoSelectedDate}
                serviceId={serviceId}
                selectedTime={time}
                onSelect={selectTime}
              />
              <div className="flex justify-between">
                <Button variant="outline" onClick={back}>
                  Back
                </Button>
                <Button onClick={next} disabled={!time}>
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === 4 && (
            <CustomerForm
              defaultValues={customer ?? undefined}
              onBack={back}
              onSubmit={handleCustomerSubmit}
            />
          )}

          {step === 5 && customer && selectedService && date && time && (
            <ReviewStep
              service={selectedService}
              date={date}
              time={time}
              customer={customer}
              onBack={back}
              onConfirm={confirmBooking}
              submitting={submitting}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewStep({
  service,
  date,
  time,
  customer,
  onBack,
  onConfirm,
  submitting,
}: {
  service: Service;
  date: Date;
  time: string;
  customer: CustomerFormValues;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-secondary/30 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Service" value={service.name} />
          <Field label="Date" value={format(date, 'EEEE, d MMM yyyy')} />
          <Field label="Time" value={formatTimeLabel(time)} />
          <Field label="Duration" value={`${service.duration_hours} hours (estimate)`} />
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h4 className="text-sm font-semibold">Your contact</h4>
        <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Name" value={customer.customer_name} />
          <Field label="Phone" value={customer.customer_phone} />
          <Field label="Email" value={customer.customer_email} compact />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <h4 className="text-sm font-semibold">Pickup</h4>
          <p className="mt-1 text-sm">
            {customer.pickup_address}
            <br />
            {customer.pickup_city} — {customer.pickup_pincode}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <h4 className="text-sm font-semibold">Drop-off</h4>
          <p className="mt-1 text-sm">
            {customer.dropoff_address}
            <br />
            {customer.dropoff_city} — {customer.dropoff_pincode}
          </p>
        </div>
      </div>

      {customer.notes && (
        <div className="rounded-xl border bg-white p-4">
          <h4 className="text-sm font-semibold">Notes</h4>
          <p className="mt-1 text-sm text-muted-foreground">{customer.notes}</p>
        </div>
      )}

      <p className="rounded-md bg-brand-50 px-3 py-2 text-xs text-brand-900">
        No payment is needed now. We'll call you within 2 hours to confirm the price and your booking.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button onClick={onConfirm} disabled={submitting} size="lg">
          {submitting ? 'Confirming…' : 'Confirm booking'}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'col-span-full' : ''}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
