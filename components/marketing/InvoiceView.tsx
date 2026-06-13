'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  HStack,
  Stack,
  Text,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { toaster } from '@/components/Toaster';
import { BUSINESS } from '@/lib/constants';
import { formatTimeLabel } from '@/lib/utils';
import type { InvoiceLineItem, InvoiceStatus } from '@/types/database';

// ---- Razorpay loader (mirrors components/booking/BookingFlow.tsx) ----
// BookingFlow already augments Window.Razorpay with the constructor
// type; importing types here would re-merge the same declaration and
// trip TS2717. Just rely on the existing global and cast at the call
// site instead.

type RazorpayInstance = { open: () => void };

let razorpayScriptPromise: Promise<boolean> | null = null;

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
      razorpayScriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

// The booking-deposit module already declares the global Window.Razorpay
// constructor — depending on import order it may not be loaded when the
// invoice page runs, so we type-assert the constructor here.
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

// ---- Props ----------------------------------------------------------
type Invoice = {
  id: string;
  amount_paise: number;
  line_items: InvoiceLineItem[];
  notes: string | null;
  status: InvoiceStatus;
  paid_at: string | null;
  received_at: string | null;
};

type Booking = {
  reference_code: string;
  service_name: string | null;
  booking_date: string;
  booking_time: string;
  pickup_city: string;
  dropoff_city: string;
  customer_name: string;
};

type RazorpayConfig = { enabled: boolean; keyId: string | null };

function paiseToInr(paise: number): string {
  return Math.round(paise / 100).toLocaleString('en-IN');
}

function formatBookingDate(yyyyMmDd: string): string {
  return format(new Date(`${yyyyMmDd}T00:00:00`), 'EEE, d MMM yyyy');
}

export function InvoiceView({
  token,
  invoice: initialInvoice,
  booking,
  razorpay,
}: {
  token: string;
  invoice: Invoice;
  booking: Booking;
  razorpay: RazorpayConfig;
}) {
  const [invoice, setInvoice] = React.useState<Invoice>(initialInvoice);
  const [paying, setPaying] = React.useState(false);

  const isPaid = invoice.status === 'paid';
  const isCash = invoice.status === 'cash_received';
  const isSettled = isPaid || isCash;

  async function payNow() {
    if (!razorpay.enabled || !razorpay.keyId) {
      toaster.create({
        type: 'error',
        title: 'Online payment is temporarily unavailable',
        description: 'Please contact our team to settle this invoice.',
      });
      return;
    }
    setPaying(true);
    try {
      const res = await fetch(`/api/invoice/${token}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        order_id?: string;
        amount_paise?: number;
        currency?: string;
      };
      if (res.status !== 201 || !body.order_id) {
        const msg =
          body.error === 'already_paid'
            ? 'This invoice has already been paid.'
            : body.error === 'cash_received'
              ? 'Our team marked this invoice as paid in cash.'
              : 'Please try again in a moment.';
        toaster.create({ type: 'error', title: "Couldn't start payment", description: msg });
        if (body.error === 'already_paid') {
          setInvoice((prev) => ({ ...prev, status: 'paid' }));
        } else if (body.error === 'cash_received') {
          setInvoice((prev) => ({ ...prev, status: 'cash_received' }));
        }
        return;
      }

      if (!(await loadRazorpayScript()) || !window.Razorpay) {
        toaster.create({
          type: 'error',
          title: "Couldn't load the payment window",
          description: 'Please check your connection or ad blocker.',
        });
        return;
      }

      await new Promise<void>((resolve) => {
        const RazorpayCtor = window.Razorpay as unknown as RazorpayCtor;
        const rzp = new RazorpayCtor({
          key: razorpay.keyId,
          order_id: body.order_id,
          amount: body.amount_paise,
          currency: body.currency ?? 'INR',
          name: BUSINESS.name,
          description: `Invoice ${booking.reference_code}`,
          prefill: { name: booking.customer_name },
          theme: { color: '#21396a' },
          modal: {
            ondismiss: () => {
              toaster.create({
                type: 'info',
                title: 'Payment cancelled',
                description: 'You can pay again any time using this link.',
              });
              resolve();
            },
          },
          handler: () => {
            // The payment.captured webhook is the authoritative source —
            // it will flip status to paid within seconds. We optimistically
            // show paid here so the customer gets immediate feedback.
            setInvoice((prev) => ({
              ...prev,
              status: 'paid',
              paid_at: new Date().toISOString(),
            }));
            toaster.create({
              type: 'success',
              title: 'Payment received',
              description: `Thank you, ${booking.customer_name.split(' ')[0]}!`,
            });
            resolve();
          },
        });
        rzp.open();
      });
    } catch {
      toaster.create({
        type: 'error',
        title: 'Network error',
        description: 'Please try again.',
      });
    } finally {
      setPaying(false);
    }
  }

  return (
    <Stack gap={5}>
      {isSettled && (
        <Card.Root borderColor={isPaid ? 'green.300' : 'blue.300'} bg={isPaid ? 'green.50' : 'blue.50'}>
          <Card.Body>
            <Heading size="md" color={isPaid ? 'green.700' : 'blue.700'}>
              {isPaid ? 'Payment received — thank you!' : 'Marked as received by our team'}
            </Heading>
            <Text mt={1} fontSize="sm" color="fg.muted">
              {isPaid && invoice.paid_at
                ? `Paid online on ${format(new Date(invoice.paid_at), 'd MMM yyyy, p')}.`
                : isCash && invoice.received_at
                  ? `Recorded as cash received on ${format(new Date(invoice.received_at), 'd MMM yyyy, p')}.`
                  : 'No further action needed.'}
            </Text>
          </Card.Body>
        </Card.Root>
      )}

      <Card.Root>
        <Card.Body>
          <Heading size="sm" mb={3}>
            Booking
          </Heading>
          <Stack gap={2} fontSize="sm">
            <Flex justify="space-between" gap={4}>
              <Text color="fg.muted">Service</Text>
              <Text fontWeight="medium">{booking.service_name ?? '—'}</Text>
            </Flex>
            <Flex justify="space-between" gap={4}>
              <Text color="fg.muted">Date</Text>
              <Text fontWeight="medium">{formatBookingDate(booking.booking_date)}</Text>
            </Flex>
            <Flex justify="space-between" gap={4}>
              <Text color="fg.muted">Time</Text>
              <Text fontWeight="medium">{formatTimeLabel(booking.booking_time)}</Text>
            </Flex>
            <Flex justify="space-between" gap={4}>
              <Text color="fg.muted">Route</Text>
              <Text fontWeight="medium">
                {booking.pickup_city} → {booking.dropoff_city}
              </Text>
            </Flex>
          </Stack>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Body>
          <Heading size="sm" mb={3}>
            Line items
          </Heading>
          <Stack gap={2} fontSize="sm">
            {invoice.line_items.map((item, idx) => (
              <Flex key={idx} justify="space-between" gap={4} borderBottomWidth="1px" pb={2}>
                <Text>{item.description}</Text>
                <Text fontWeight="medium" whiteSpace="nowrap">
                  ₹{item.amount_inr.toLocaleString('en-IN')}
                </Text>
              </Flex>
            ))}
            <Flex justify="space-between" pt={2}>
              <Text fontSize="md" fontWeight="semibold">
                Total
              </Text>
              <Text fontSize="xl" fontWeight="bold" color="brand.700">
                ₹{paiseToInr(invoice.amount_paise)}
              </Text>
            </Flex>
            {invoice.notes && (
              <Box mt={3} bg="bg.subtle" rounded="lg" p={3} fontSize="sm" whiteSpace="pre-wrap">
                {invoice.notes}
              </Box>
            )}
          </Stack>
        </Card.Body>
      </Card.Root>

      {!isSettled && (
        <HStack justify="center" pt={2}>
          <Button
            size="lg"
            colorPalette="brand"
            onClick={payNow}
            loading={paying}
            disabled={!razorpay.enabled || invoice.amount_paise <= 0}
          >
            Pay ₹{paiseToInr(invoice.amount_paise)} now
          </Button>
        </HStack>
      )}
      {!isSettled && !razorpay.enabled && (
        <Text fontSize="xs" color="fg.muted" textAlign="center">
          Online payment is temporarily unavailable. Please contact our team
          on {BUSINESS.phone} to settle this invoice.
        </Text>
      )}
    </Stack>
  );
}
