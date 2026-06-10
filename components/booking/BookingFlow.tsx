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
import { toaster } from '@/components/Toaster';
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
        setTime(null);
        setStep(3);
        toaster.create({
          type: 'error',
          title: 'That slot was just taken',
          description: 'Please pick a different time.',
        });
        return;
      }

      const body = (await res.json().catch(() => ({}))) as { error?: string };
      toaster.create({
        type: 'error',
        title: "Couldn't complete booking",
        description: body.error
          ? `Reason: ${body.error.replace(/_/g, ' ')}`
          : 'Please try again in a moment.',
      });
    } catch {
      toaster.create({
        type: 'error',
        title: 'Network error',
        description: 'Please check your connection and try again.',
      });
    } finally {
      setSubmitting(false);
    }
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
                onBack={back}
                onConfirm={confirmBooking}
                submitting={submitting}
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
    <Stack gap={5}>
      <Box rounded="xl" borderWidth="1px" bg="bg.subtle" p={4}>
        <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
          <ReviewItem label="Service" value={service.name} />
          <ReviewItem label="Date" value={format(date, 'EEEE, d MMM yyyy')} />
          <ReviewItem label="Time" value={formatTimeLabel(time)} />
          <ReviewItem label="Duration" value={`${service.duration_hours} hours (estimate)`} />
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

      <Box rounded="md" bg="brand.50" px={3} py={2} fontSize="xs" color="brand.900">
        No payment is needed now. We&apos;ll call you within 2 hours to confirm the price and your booking.
      </Box>

      <Flex direction={{ base: 'column', sm: 'row' }} justify="space-between" gap={2}>
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button onClick={onConfirm} loading={submitting} loadingText="Confirming…" colorPalette="brand" size="lg">
          Confirm booking
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
