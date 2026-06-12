'use client';

import * as React from 'react';
import NextLink from 'next/link';
import {
  Badge,
  Box,
  Button,
  Card,
  Field,
  Flex,
  Input,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
} from '@chakra-ui/react';
import { CalendarX2, ListChecks, Search } from 'lucide-react';
import { toaster } from '@/components/Toaster';
import { EmailVerification } from '@/components/booking/EmailVerification';
import { STATUS_LABELS, type BookingStatus } from '@/lib/constants';
import { CANCEL_MIN_HOURS_BEFORE } from '@/lib/bookingPolicy';
import { formatINR, formatTimeLabel } from '@/lib/utils';

type BookingSummary = {
  id: string;
  reference_code: string;
  booking_date: string;
  booking_time: string;
  duration_hours: number | null;
  status: BookingStatus;
  pickup_city: string;
  dropoff_city: string;
  custom_resources: {
    workers?: number;
    vehicle?: string;
    hours?: number;
    indicative_price_paise?: number;
  } | null;
  created_at: string;
  service: { name: string; slug: string } | null;
  cancellable: boolean;
};

const STATUS_PALETTE: Record<BookingStatus, string> = {
  pending: 'orange',
  confirmed: 'blue',
  in_progress: 'purple',
  completed: 'green',
  cancelled: 'red',
};

function formatDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function BookingCard({
  booking,
  onCancelled,
  email,
  token,
}: {
  booking: BookingSummary;
  email: string;
  token: string | null;
  onCancelled: (id: string) => void;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);

  async function cancelBooking() {
    if (!token) return;
    setCancelling(true);
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id, email, token }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        windowHours?: number;
      };
      if (res.ok && body.ok) {
        toaster.create({
          type: 'success',
          title: 'Booking cancelled',
          description: `${booking.reference_code} is cancelled — the slot has been freed.`,
        });
        onCancelled(booking.id);
      } else if (body.error === 'too_late_to_cancel') {
        toaster.create({
          type: 'error',
          title: "Can't cancel this close to the slot",
          description: `Cancellation closes ${body.windowHours ?? CANCEL_MIN_HOURS_BEFORE} hours before the move. Please call us instead.`,
        });
      } else if (res.status === 401) {
        toaster.create({
          type: 'error',
          title: 'Session expired',
          description: 'Please verify your email again to manage bookings.',
        });
      } else {
        toaster.create({
          type: 'error',
          title: "Couldn't cancel the booking",
          description: 'Please try again, or call us and quote your reference code.',
        });
      }
    } catch {
      toaster.create({ type: 'error', title: 'Network error — please try again.' });
    } finally {
      setCancelling(false);
      setConfirming(false);
    }
  }

  return (
    <Box rounded="xl" borderWidth="1px" bg="white" p={4}>
      <Flex justify="space-between" align="flex-start" gap={2} wrap="wrap">
        <Box>
          <Flex align="center" gap={2} wrap="wrap">
            <Text fontFamily="mono" fontWeight="bold" color="brand.700">
              {booking.reference_code}
            </Text>
            <Badge colorPalette={STATUS_PALETTE[booking.status] ?? 'gray'}>
              {STATUS_LABELS[booking.status] ?? booking.status}
            </Badge>
          </Flex>
          <Text mt={1} fontSize="sm" fontWeight="medium">
            {booking.service?.name ?? 'Move'}
          </Text>
        </Box>
        <Box textAlign={{ base: 'left', sm: 'right' }}>
          <Text fontSize="sm" fontWeight="medium">
            {formatDate(booking.booking_date)}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            {formatTimeLabel(booking.booking_time)}
          </Text>
        </Box>
      </Flex>

      <Text mt={2} fontSize="sm" color="fg.muted">
        {booking.pickup_city} → {booking.dropoff_city}
      </Text>

      {booking.custom_resources && (
        <Text mt={1} fontSize="xs" color="fg.muted">
          Custom move: {booking.custom_resources.workers} workers ·{' '}
          {booking.custom_resources.vehicle} · ~{booking.custom_resources.hours} h
          {booking.custom_resources.indicative_price_paise != null &&
            ` · indicative ${formatINR(booking.custom_resources.indicative_price_paise)}`}
        </Text>
      )}

      {booking.cancellable && token && (
        <Flex mt={3} gap={2} align="center">
          {!confirming ? (
            <Button
              variant="outline"
              colorPalette="red"
              size="xs"
              onClick={() => setConfirming(true)}
            >
              <CalendarX2 size={14} /> Cancel booking
            </Button>
          ) : (
            <>
              <Button
                colorPalette="red"
                size="xs"
                onClick={cancelBooking}
                loading={cancelling}
                loadingText="Cancelling…"
              >
                Yes, cancel it
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setConfirming(false)}
                disabled={cancelling}
              >
                Keep booking
              </Button>
            </>
          )}
        </Flex>
      )}
      {!booking.cancellable &&
        (booking.status === 'pending' || booking.status === 'confirmed') && (
          <Text mt={2} fontSize="xs" color="fg.muted">
            Online cancellation closes {CANCEL_MIN_HOURS_BEFORE} h before the slot — call
            us if your plans changed.
          </Text>
        )}
    </Box>
  );
}

/**
 * Account-less "My bookings": verify the email once via OTP, then see and
 * manage every booking under it. Also offers a quick reference-code
 * lookup (read-only, no OTP).
 */
export function MyBookings() {
  const [mode, setMode] = React.useState<'list' | 'lookup'>('list');

  // List mode state
  const [email, setEmail] = React.useState('');
  const [emailLocked, setEmailLocked] = React.useState(false);
  const [token, setToken] = React.useState<string | null>(null);
  const [bookings, setBookings] = React.useState<BookingSummary[] | null>(null);
  const [loadingList, setLoadingList] = React.useState(false);

  // Lookup mode state
  const [refCode, setRefCode] = React.useState('');
  const [lookupEmail, setLookupEmail] = React.useState('');
  const [lookupResult, setLookupResult] = React.useState<
    BookingSummary | 'not_found' | null
  >(null);
  const [lookingUp, setLookingUp] = React.useState(false);

  const fetchBookings = React.useCallback(
    async (verifiedToken: string) => {
      setLoadingList(true);
      try {
        const res = await fetch('/api/bookings/my', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, token: verifiedToken }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          bookings?: BookingSummary[];
          token?: string;
          error?: string;
        };
        if (res.ok && body.bookings) {
          setBookings(body.bookings);
          if (body.token) setToken(body.token);
        } else if (res.status === 401) {
          setToken(null);
          toaster.create({
            type: 'error',
            title: 'Session expired',
            description: 'Please verify your email again.',
          });
        } else {
          toaster.create({ type: 'error', title: "Couldn't load your bookings" });
        }
      } catch {
        toaster.create({ type: 'error', title: 'Network error — please try again.' });
      } finally {
        setLoadingList(false);
      }
    },
    [email],
  );

  function handleVerified(newToken: string) {
    setToken(newToken);
    void fetchBookings(newToken);
  }

  function handleCancelled(id: string) {
    setBookings(
      (prev) =>
        prev?.map((b) =>
          b.id === id ? { ...b, status: 'cancelled' as const, cancellable: false } : b,
        ) ?? null,
    );
  }

  async function quickLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookingUp(true);
    setLookupResult(null);
    try {
      const res = await fetch('/api/bookings/my', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: lookupEmail,
          reference_code: refCode.trim().toUpperCase(),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        booking?: BookingSummary;
        error?: string;
      };
      if (res.ok && body.booking) {
        setLookupResult(body.booking);
      } else {
        setLookupResult('not_found');
      }
    } catch {
      toaster.create({ type: 'error', title: 'Network error — please try again.' });
    } finally {
      setLookingUp(false);
    }
  }

  return (
    <Box mx="auto" maxW="2xl">
      <Flex mb={4} gap={2}>
        <Button
          variant={mode === 'list' ? 'solid' : 'outline'}
          colorPalette="brand"
          size="sm"
          onClick={() => setMode('list')}
        >
          <ListChecks size={16} /> My bookings
        </Button>
        <Button
          variant={mode === 'lookup' ? 'solid' : 'outline'}
          colorPalette="brand"
          size="sm"
          onClick={() => setMode('lookup')}
        >
          <Search size={16} /> Quick lookup
        </Button>
      </Flex>

      {mode === 'list' && (
        <Card.Root>
          <Card.Body>
            <Stack gap={4}>
              {!token && (
                <>
                  <Field.Root>
                    <Field.Label>Your email</Field.Label>
                    <Input
                      type="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailLocked(false);
                      }}
                      disabled={emailLocked}
                    />
                    <Field.HelperText>
                      We&apos;ll send a one-time code — no account or password needed.
                    </Field.HelperText>
                  </Field.Root>
                  {!emailLocked ? (
                    <Button
                      colorPalette="brand"
                      alignSelf="flex-start"
                      disabled={!/^\S+@\S+\.\S+$/.test(email)}
                      onClick={() => setEmailLocked(true)}
                    >
                      Continue
                    </Button>
                  ) : (
                    <EmailVerification
                      email={email.trim().toLowerCase()}
                      purpose="manage"
                      onVerified={handleVerified}
                    />
                  )}
                </>
              )}

              {token && loadingList && (
                <Stack gap={3}>
                  <Skeleton height="90px" rounded="xl" />
                  <Skeleton height="90px" rounded="xl" />
                </Stack>
              )}

              {token && !loadingList && bookings && bookings.length === 0 && (
                <Box textAlign="center" py={6}>
                  <Text fontWeight="medium">No bookings under {email} yet.</Text>
                  <Text mt={1} fontSize="sm" color="fg.muted">
                    Ready to plan your move?
                  </Text>
                  <Button asChild mt={4} colorPalette="brand">
                    <NextLink href="/book">Book a move</NextLink>
                  </Button>
                </Box>
              )}

              {token && !loadingList && bookings && bookings.length > 0 && (
                <Stack gap={3}>
                  <Text fontSize="sm" color="fg.muted">
                    {bookings.length} booking{bookings.length === 1 ? '' : 's'} for{' '}
                    <Text as="span" fontWeight="medium" color="fg">
                      {email}
                    </Text>
                  </Text>
                  {bookings.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      email={email.trim().toLowerCase()}
                      token={token}
                      onCancelled={handleCancelled}
                    />
                  ))}
                </Stack>
              )}
            </Stack>
          </Card.Body>
        </Card.Root>
      )}

      {mode === 'lookup' && (
        <Card.Root>
          <Card.Body>
            <form onSubmit={quickLookup}>
              <Stack gap={4}>
                <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                  <Field.Root>
                    <Field.Label>Reference code</Field.Label>
                    <Input
                      placeholder="ESX-XXXXX"
                      value={refCode}
                      onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                      fontFamily="mono"
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Booking email</Field.Label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={lookupEmail}
                      onChange={(e) => setLookupEmail(e.target.value)}
                    />
                  </Field.Root>
                </SimpleGrid>
                <Button
                  type="submit"
                  colorPalette="brand"
                  alignSelf="flex-start"
                  loading={lookingUp}
                  loadingText="Looking up…"
                  disabled={!refCode.trim() || !/^\S+@\S+\.\S+$/.test(lookupEmail)}
                >
                  <Search size={16} /> Find booking
                </Button>

                {lookupResult === 'not_found' && (
                  <Box rounded="md" borderWidth="1px" borderColor="orange.200" bg="orange.50" px={4} py={3} fontSize="sm" color="orange.900">
                    No booking found for that reference code and email combination.
                    Double-check both, or use &quot;My bookings&quot; to see everything
                    under your email.
                  </Box>
                )}

                {lookupResult && lookupResult !== 'not_found' && (
                  <Stack gap={2}>
                    <BookingCard
                      booking={lookupResult}
                      email={lookupEmail.trim().toLowerCase()}
                      token={null}
                      onCancelled={() => undefined}
                    />
                    <Text fontSize="xs" color="fg.muted">
                      Read-only view. To cancel, switch to &quot;My bookings&quot; and
                      verify your email.
                    </Text>
                  </Stack>
                )}
              </Stack>
            </form>
          </Card.Body>
        </Card.Root>
      )}
    </Box>
  );
}
