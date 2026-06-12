'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  Box,
  Card,
  Heading,
  Button,
  Stack,
  SimpleGrid,
  Flex,
  Text,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { toaster } from '@/components/Toaster';
import { StepIndicator, type Step } from './StepIndicator';
import { ServicePicker } from './ServicePicker';
import { BookingDatePicker } from './BookingDatePicker';
import { SlotPicker } from './SlotPicker';
import { CustomerForm, type CustomerFormValues } from './CustomerForm';
import { EmailVerification } from './EmailVerification';
import { CustomMoveSelector, DEFAULT_CUSTOM_SELECTION } from './CustomMoveSelector';
import type { Service } from '@/types/database';
import {
  computeCustomPrice,
  DEFAULT_RATE_CARD,
  type CustomRateCard,
  type CustomSelection,
} from '@/lib/customPricing';
import { formatINR, formatTimeLabel } from '@/lib/utils';
import { recordFunnelEvent } from '@/lib/analytics';
import { BUSINESS } from '@/lib/constants';
import { CANCEL_MIN_HOURS_BEFORE } from '@/lib/bookingPolicy';

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

/** Razorpay deposit config, resolved server-side in app/(marketing)/book/page.tsx. */
export type PaymentsConfig = {
  enabled: boolean;
  keyId: string | null;
  depositInr: number;
};

const PAYMENTS_DISABLED: PaymentsConfig = {
  enabled: false,
  keyId: null,
  depositInr: 0,
};

// ---- Razorpay Checkout (drop-in) --------------------------------------
type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: 'payment.failed', cb: (resp: unknown) => void) => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let razorpayScriptPromise: Promise<boolean> | null = null;

/** Injects checkout.js once; resolves false when the script can't load. */
function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      razorpayScriptPromise = null; // allow a retry on the next attempt
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function BookingFlow({
  services,
  availability,
  rateCard = DEFAULT_RATE_CARD,
  payments = PAYMENTS_DISABLED,
}: {
  services: Service[];
  availability: AvailabilityConfig;
  rateCard?: CustomRateCard;
  payments?: PaymentsConfig;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialServiceId = React.useMemo(() => {
    const slug = searchParams.get('service');
    if (slug) {
      const found = services.find((s) => s.slug === slug);
      if (found) return found.id;
    }
    return services[0]?.id ?? null;
  }, [searchParams, services]);

  const [step, setStep] = React.useState<number>(1);
  const [serviceId, setServiceId] = React.useState<string | null>(initialServiceId);
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [time, setTime] = React.useState<string | null>(null);
  const [customer, setCustomer] = React.useState<CustomerFormValues | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [customSelection, setCustomSelection] = React.useState<CustomSelection>(
    DEFAULT_CUSTOM_SELECTION,
  );
  // Signed proof from /api/bookings/otp/verify that the customer owns the
  // email on the form. Required by POST /api/bookings.
  const [verificationToken, setVerificationToken] = React.useState<string | null>(null);

  const selectedService = services.find((s) => s.id === serviceId) ?? null;
  const isCustomService = Boolean(selectedService?.is_custom);
  const isoSelectedDate = date ? isoDate(date) : null;

  // Fire booking_started once when the wizard mounts.
  React.useEffect(() => {
    recordFunnelEvent({
      event_type: 'booking_started',
      service_slug: selectedService?.slug ?? null,
    });
    // intentionally empty deps — once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function next() {
    setStep((s) => {
      const nextStep = Math.min(s + 1, 5);
      if (nextStep !== s) {
        recordFunnelEvent({
          event_type: 'booking_step_completed',
          service_slug: selectedService?.slug ?? null,
          step: s, // the step we just finished
        });
      }
      return nextStep;
    });
  }
  function back() {
    setStep((s) => Math.max(s - 1, 1));
  }

  function selectService(id: string) {
    setServiceId(id);
    setTime(null);
  }

  function selectDate(d: Date | undefined) {
    setDate(d);
    setTime(null);
    if (d) next();
  }

  function selectTime(t: string) {
    setTime(t);
    next();
  }

  function handleCustomerSubmit(values: CustomerFormValues) {
    // A token is bound to one email — changing the email needs a re-verify.
    if (customer && customer.customer_email !== values.customer_email) {
      setVerificationToken(null);
    }
    setCustomer(values);
    next();
  }

  function buildBookingPayload() {
    return {
      service_id: serviceId,
      booking_date: isoSelectedDate,
      booking_time: time,
      ...customer,
      verification_token: verificationToken,
      ...(isCustomService ? { custom_resources: customSelection } : {}),
    };
  }

  function goToConfirmation(referenceCode: string) {
    recordFunnelEvent({
      event_type: 'booking_submitted',
      service_slug: selectedService?.slug ?? null,
      payload: { reference_code: referenceCode },
    });
    router.push(`/booking-confirmed?ref=${encodeURIComponent(referenceCode)}`);
  }

  /** Shared 4xx handling for POST /api/bookings and /api/payments/order. */
  function showBookingError(status: number, body: { error?: string }) {
    if (status === 409) {
      setTime(null);
      setStep(3);
      toaster.create({
        type: 'error',
        title: 'That slot was just taken',
        description: 'Please pick a different time.',
      });
      return;
    }
    if (status === 429 && body.error === 'too_many_active_bookings') {
      toaster.create({
        type: 'error',
        title: 'You already have several upcoming bookings',
        description:
          'To keep things fair we pause new bookings past 5 active ones. Manage or cancel an existing booking on the Track & manage page.',
        duration: 9000,
      });
      return;
    }
    if (status === 401) {
      setVerificationToken(null);
      toaster.create({
        type: 'error',
        title: 'Email verification expired',
        description: 'Please verify your email again and re-confirm.',
      });
      return;
    }
    toaster.create({
      type: 'error',
      title: "Couldn't complete booking",
      description: body.error
        ? `Reason: ${body.error.replace(/_/g, ' ')}`
        : 'Please try again in a moment.',
    });
  }

  async function directBooking() {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBookingPayload()),
    });

    if (res.status === 201) {
      const body = (await res.json()) as { reference_code: string };
      goToConfirmation(body.reference_code);
      return true; // navigating away — keep the button in its loading state
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    showBookingError(res.status, body);
    return false;
  }

  /**
   * Paid flow: create the deposit order, open Razorpay Checkout, then
   * verify the signature server-side. The booking exists only after
   * verification (or the payment.captured webhook) succeeds. Dismissing
   * or failing the payment books nothing; the email verification stays
   * valid for 15 minutes so retrying skips the OTP.
   */
  async function payAndBook(): Promise<boolean> {
    const res = await fetch('/api/payments/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBookingPayload()),
    });
    const orderBody = (await res.json().catch(() => ({}))) as {
      error?: string;
      order_id?: string;
      amount_paise?: number;
      currency?: string;
      key_id?: string;
      deposit_inr?: number;
    };
    if (res.status !== 201 || !orderBody.order_id || !orderBody.key_id) {
      showBookingError(res.status, orderBody);
      return false;
    }

    if (!(await loadRazorpayScript()) || !window.Razorpay) {
      toaster.create({
        type: 'error',
        title: "Couldn't load the payment window",
        description:
          'Please check your connection (or ad blocker) and try again.',
      });
      return false;
    }

    return new Promise<boolean>((resolve) => {
      const rzp = new window.Razorpay!({
        key: orderBody.key_id,
        order_id: orderBody.order_id,
        amount: orderBody.amount_paise,
        currency: orderBody.currency ?? 'INR',
        name: BUSINESS.name,
        description: `Refundable booking deposit (₹${orderBody.deposit_inr ?? payments.depositInr})`,
        prefill: {
          name: customer!.customer_name,
          email: customer!.customer_email,
          contact: customer!.customer_phone,
        },
        notes: { booking_date: isoSelectedDate },
        theme: { color: '#21396a' },
        modal: {
          ondismiss: () => {
            toaster.create({
              type: 'info',
              title: 'Payment cancelled — nothing was booked',
              description:
                'Your slot is not reserved yet. You can pay again within 15 minutes without re-verifying your email.',
              duration: 8000,
            });
            resolve(false);
          },
        },
        handler: async (response: RazorpayCheckoutResponse) => {
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });
            const verifyBody = (await verifyRes.json().catch(() => ({}))) as {
              ok?: boolean;
              reference_code?: string;
            };
            if (verifyRes.ok && verifyBody.ok && verifyBody.reference_code) {
              goToConfirmation(verifyBody.reference_code);
              resolve(true);
              return;
            }
            // Payment went through but our confirm call didn't. The
            // payment.captured webhook will still create the booking.
            toaster.create({
              type: 'warning',
              title: 'Payment received — confirming your booking',
              description:
                'We could not confirm instantly, but your booking will appear under Track & manage within a few minutes. Your deposit is safe.',
              duration: 12000,
            });
            router.push('/booking-status');
            resolve(true);
          } catch {
            toaster.create({
              type: 'warning',
              title: 'Payment received — confirming your booking',
              description:
                'Network hiccup while confirming. Your deposit is safe and the booking will appear under Track & manage shortly.',
              duration: 12000,
            });
            router.push('/booking-status');
            resolve(true);
          }
        },
      });
      rzp.on('payment.failed', () => {
        // Razorpay keeps its modal open and offers a retry on the same
        // order; we just surface what happened.
        toaster.create({
          type: 'error',
          title: 'Payment failed',
          description: 'No money was taken for this attempt. You can retry from the payment window.',
        });
      });
      rzp.open();
    });
  }

  async function confirmBooking() {
    if (!serviceId || !isoSelectedDate || !time || !customer) return;
    if (!verificationToken) {
      toaster.create({
        type: 'error',
        title: 'Please verify your email first',
        description: 'Use the "Send code" button above to verify your email.',
      });
      return;
    }
    setSubmitting(true);
    try {
      const usePayments = payments.enabled && Boolean(payments.keyId);
      const navigating = usePayments ? await payAndBook() : await directBooking();
      if (navigating) return; // router.push in flight — keep the spinner
    } catch {
      toaster.create({
        type: 'error',
        title: 'Network error',
        description: 'Please check your connection and try again.',
      });
    }
    setSubmitting(false);
  }

  return (
    <Box mx="auto" maxW="3xl">
      <Box mb={6} rounded="2xl" borderWidth="1px" bg="white" p={{ base: 4, sm: 5 }} shadow="sm">
        <StepIndicator steps={STEPS} current={step} />
      </Box>

      <Card.Root>
        <Card.Header>
          <Card.Title>
            {step === 1 && 'Choose a service'}
            {step === 2 && 'Pick a date'}
            {step === 3 && 'Pick a time'}
            {step === 4 && 'Your details'}
            {step === 5 && 'Review & confirm'}
          </Card.Title>
        </Card.Header>
        <Card.Body>
          <Stack gap={5}>
            {step === 1 && (
              <>
                <ServicePicker
                  services={services}
                  selectedId={serviceId}
                  onSelect={selectService}
                />
                {isCustomService && (
                  <CustomMoveSelector
                    value={customSelection}
                    onChange={setCustomSelection}
                    rateCard={rateCard}
                  />
                )}
                <Flex justify="flex-end">
                  <Button onClick={next} colorPalette="brand" disabled={!serviceId}>
                    Continue
                  </Button>
                </Flex>
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
                <Flex justify="space-between">
                  <Button variant="outline" onClick={back}>
                    Back
                  </Button>
                  <Button onClick={next} colorPalette="brand" disabled={!date}>
                    Continue
                  </Button>
                </Flex>
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
                <Flex justify="space-between">
                  <Button variant="outline" onClick={back}>
                    Back
                  </Button>
                  <Button onClick={next} colorPalette="brand" disabled={!time}>
                    Continue
                  </Button>
                </Flex>
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
                customSelection={isCustomService ? customSelection : null}
                rateCard={rateCard}
                emailVerified={Boolean(verificationToken)}
                onVerified={setVerificationToken}
                onBack={back}
                onConfirm={confirmBooking}
                submitting={submitting}
                payments={payments}
              />
            )}
          </Stack>
        </Card.Body>
      </Card.Root>
    </Box>
  );
}

function ReviewStep({
  service,
  date,
  time,
  customer,
  customSelection,
  rateCard,
  emailVerified,
  onVerified,
  onBack,
  onConfirm,
  submitting,
  payments,
}: {
  service: Service;
  date: Date;
  time: string;
  customer: CustomerFormValues;
  customSelection: CustomSelection | null;
  rateCard: CustomRateCard;
  emailVerified: boolean;
  onVerified: (token: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
  payments: PaymentsConfig;
}) {
  const customPrice = customSelection
    ? computeCustomPrice(customSelection, rateCard)
    : null;
  const vehicleLabel = customSelection
    ? (rateCard.vehicles.find((v) => v.id === customSelection.vehicle)?.label ??
      customSelection.vehicle)
    : null;
  const durationHours = customSelection ? customSelection.hours : service.duration_hours;

  return (
    <Stack gap={5}>
      <Box rounded="xl" borderWidth="1px" bg="bg.subtle" p={4}>
        <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
          <ReviewItem label="Service" value={service.name} />
          <ReviewItem label="Date" value={format(date, 'EEEE, d MMM yyyy')} />
          <ReviewItem label="Time" value={formatTimeLabel(time)} />
          <ReviewItem label="Duration" value={`${durationHours} hours (estimate)`} />
          {customSelection && (
            <>
              <ReviewItem label="Crew" value={`${customSelection.workers} workers`} />
              <ReviewItem label="Vehicle" value={vehicleLabel ?? '—'} />
              {customPrice != null && (
                <ReviewItem
                  label="Indicative price"
                  value={`${formatINR(customPrice)} (confirmed on call)`}
                  full
                />
              )}
            </>
          )}
        </SimpleGrid>
      </Box>

      <Box rounded="xl" borderWidth="1px" bg="white" p={4}>
        <Heading as="h4" fontSize="sm" fontWeight="semibold">
          Your contact
        </Heading>
        <SimpleGrid mt={2} columns={{ base: 1, sm: 2 }} gap={3}>
          <ReviewItem label="Name" value={customer.customer_name} />
          <ReviewItem label="Phone" value={customer.customer_phone} />
          <ReviewItem label="Email" value={customer.customer_email} full />
        </SimpleGrid>
      </Box>

      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
        <Box rounded="xl" borderWidth="1px" bg="white" p={4}>
          <Heading as="h4" fontSize="sm" fontWeight="semibold">
            Pickup
          </Heading>
          <Text mt={1} fontSize="sm">
            {customer.pickup_address}
            <br />
            {customer.pickup_city} — {customer.pickup_pincode}
          </Text>
        </Box>
        <Box rounded="xl" borderWidth="1px" bg="white" p={4}>
          <Heading as="h4" fontSize="sm" fontWeight="semibold">
            Drop-off
          </Heading>
          <Text mt={1} fontSize="sm">
            {customer.dropoff_address}
            <br />
            {customer.dropoff_city} — {customer.dropoff_pincode}
          </Text>
        </Box>
      </SimpleGrid>

      {customer.notes && (
        <Box rounded="xl" borderWidth="1px" bg="white" p={4}>
          <Heading as="h4" fontSize="sm" fontWeight="semibold">
            Notes
          </Heading>
          <Text mt={1} fontSize="sm" color="fg.muted">
            {customer.notes}
          </Text>
        </Box>
      )}

      <EmailVerification
        email={customer.customer_email}
        name={customer.customer_name}
        purpose="booking"
        onVerified={onVerified}
      />

      {payments.enabled ? (
        <Box rounded="md" bg="brand.50" px={3} py={2} fontSize="xs" color="brand.900">
          A refundable deposit of <b>₹{payments.depositInr}</b> confirms your booking
          instantly — it&apos;s returned in full if you cancel at least{' '}
          {CANCEL_MIN_HOURS_BEFORE} hours before your slot. The remaining amount is
          payable on the day of service. Track or cancel any booking from the{' '}
          <NextLink href="/booking-status" style={{ textDecoration: 'underline' }}>
            Track &amp; manage page
          </NextLink>
          .
        </Box>
      ) : (
        <Box rounded="md" bg="brand.50" px={3} py={2} fontSize="xs" color="brand.900">
          No payment is needed now. We&apos;ll call you within 2 hours to confirm the price and your booking.
          {' '}You can track or cancel any booking later from the{' '}
          <NextLink href="/booking-status" style={{ textDecoration: 'underline' }}>
            Track &amp; manage page
          </NextLink>
          .
        </Box>
      )}

      <Flex direction={{ base: 'column', sm: 'row' }} justify="space-between" gap={2}>
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button
          onClick={onConfirm}
          loading={submitting}
          loadingText={payments.enabled ? 'Opening payment…' : 'Confirming…'}
          colorPalette="brand"
          size="lg"
          disabled={!emailVerified}
          title={emailVerified ? undefined : 'Verify your email to enable'}
        >
          {payments.enabled
            ? `Pay ₹${payments.depositInr} deposit & confirm`
            : 'Confirm booking'}
        </Button>
      </Flex>
    </Stack>
  );
}

function ReviewItem({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <Box gridColumn={full ? { sm: '1 / -1' } : undefined}>
      <Text fontSize="xs" textTransform="uppercase" letterSpacing="wide" color="fg.muted">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="medium">
        {value}
      </Text>
    </Box>
  );
}
