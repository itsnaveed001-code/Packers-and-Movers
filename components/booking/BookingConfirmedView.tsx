'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Phone,
  MessageCircle,
  Copy,
  Download,
  CalendarPlus,
} from 'lucide-react';
import {
  Box,
  Card,
  Button,
  Skeleton,
  Stack,
  SimpleGrid,
  Flex,
  Heading,
  Text,
} from '@chakra-ui/react';
import { toaster } from '@/components/Toaster';
import { formatTimeLabel, telUrl, whatsappUrl } from '@/lib/utils';
import { STATUS_LABELS, BUSINESS } from '@/lib/constants';
import { googleCalendarUrl, buildIcs, type CalendarEvent } from '@/lib/calendar';

type LookupBody = {
  reference_code: string;
  booking_date: string;
  booking_time: string;
  duration_hours: number | null;
  status: keyof typeof STATUS_LABELS;
  customer_first_name: string;
  pickup_city: string;
  dropoff_city: string;
  service: { name: string; slug: string } | null;
};

export function BookingConfirmedView() {
  const params = useSearchParams();
  const ref = params.get('ref');

  const [state, setState] = React.useState<
    { kind: 'loading' } | { kind: 'ok'; data: LookupBody } | { kind: 'error' }
  >({ kind: 'loading' });

  React.useEffect(() => {
    if (!ref) {
      setState({ kind: 'error' });
      return;
    }
    fetch(`/api/bookings/lookup?ref=${encodeURIComponent(ref)}`)
      .then(async (res) => {
        if (!res.ok) {
          setState({ kind: 'error' });
          return;
        }
        const data = (await res.json()) as LookupBody;
        setState({ kind: 'ok', data });
      })
      .catch(() => setState({ kind: 'error' }));
  }, [ref]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toaster.create({ type: 'success', title: 'Copied reference code' });
    } catch {
      toaster.create({ type: 'error', title: "Couldn't copy — please write it down" });
    }
  }

  async function downloadReceipt() {
    if (!ref) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const left = 48;
      let y = 64;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(14, 26, 61); // brand navy #0E1A3D
      doc.text(BUSINESS.name, left, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      y += 20;
      doc.text('Booking receipt', left, y);

      y += 16;
      doc.setDrawColor(226, 232, 240);
      doc.line(left, y, 547, y);

      y += 34;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(14, 26, 61);
      doc.text(`Reference: ${ref}`, left, y);

      const d = state.kind === 'ok' ? state.data : null;
      const rows: [string, string][] = [
        ['Service', d?.service?.name ?? '—'],
        [
          'Date',
          d
            ? new Date(d.booking_date).toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : '—',
        ],
        ['Time', d ? formatTimeLabel(d.booking_time) : '—'],
        ['Route', d ? `${d.pickup_city} to ${d.dropoff_city}` : '—'],
        ['Status', d ? STATUS_LABELS[d.status] : 'Pending'],
      ];

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      rows.forEach(([k, v]) => {
        y += 26;
        doc.setTextColor(100, 116, 139);
        doc.text(k, left, y);
        doc.setTextColor(15, 23, 42);
        doc.text(v, left + 130, y);
      });

      y += 44;
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('No payment was taken online — pay on the day of service.', left, y);
      y += 16;
      doc.text(`Questions? Call ${BUSINESS.phone} or message us on WhatsApp.`, left, y);

      doc.save(`${BUSINESS.name}-Booking-${ref}.pdf`);
      toaster.create({ type: 'success', title: 'Receipt downloaded' });
    } catch {
      toaster.create({ type: 'error', title: 'Could not generate the receipt' });
    }
  }

  function eventFor(d: LookupBody): CalendarEvent {
    return {
      title: `${BUSINESS.name} move — ${d.service?.name ?? 'Shifting'}`,
      description:
        `Booking reference: ${d.reference_code}\n` +
        `Route: ${d.pickup_city} → ${d.dropoff_city}\n` +
        `We'll call within 2 hours to confirm. Questions? ${BUSINESS.phone}.`,
      location: `${d.pickup_city} → ${d.dropoff_city}, Bengaluru`,
      date: d.booking_date,
      time: d.booking_time,
      durationHours: d.duration_hours && d.duration_hours > 0 ? d.duration_hours : 3,
    };
  }

  function downloadIcs(d: LookupBody) {
    try {
      const blob = new Blob([buildIcs(eventFor(d))], {
        type: 'text/calendar;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${BUSINESS.name}-Booking-${d.reference_code}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toaster.create({ type: 'success', title: 'Calendar file downloaded' });
    } catch {
      toaster.create({ type: 'error', title: 'Could not create the calendar file' });
    }
  }

  if (!ref) {
    return (
      <Box mx="auto" maxW="md" textAlign="center">
        <Text color="fg.muted">No reference code in the URL.</Text>
        <Button asChild mt={4} colorPalette="brand">
          <NextLink href="/book">Book a move</NextLink>
        </Button>
      </Box>
    );
  }

  return (
    <Box mx="auto" maxW="2xl">
      <Box mb={6} textAlign="center">
        <Flex
          display="inline-flex"
          align="center"
          justify="center"
          h={14}
          w={14}
          rounded="full"
          bg="green.100"
          color="green.600"
        >
          <CheckCircle2 size={28} />
        </Flex>
        <Heading as="h1" mt={4} fontSize="3xl" letterSpacing="tight">
          Booking received!
        </Heading>
        <Text mt={2} color="fg.muted">
          Save your reference code — we&apos;ll ask for it when we call.
        </Text>
      </Box>

      <Card.Root>
        <Card.Body>
          <Stack gap={5}>
            <Box
              rounded="xl"
              borderWidth="2px"
              borderStyle="dashed"
              borderColor="brand.300"
              bg="brand.50"
              p={5}
              textAlign="center"
            >
              <Text fontSize="xs" textTransform="uppercase" letterSpacing="wide" color="brand.700">
                Your reference code
              </Text>
              <Text mt={1} fontFamily="mono" fontSize={{ base: '3xl', sm: '4xl' }} fontWeight="bold" color="brand.700">
                {ref}
              </Text>
              <Button
                variant="ghost"
                size="xs"
                colorPalette="brand"
                mt={3}
                onClick={() => copy(ref)}
              >
                <Copy size={14} /> Copy code
              </Button>
            </Box>

            <Box rounded="md" borderWidth="1px" borderColor="orange.200" bg="orange.50" px={4} py={3} fontSize="sm" color="orange.900">
              <Text as="strong">What happens next:</Text> Our team will call you within 2
              hours to confirm your booking and walk through the details.
            </Box>

            <Button onClick={downloadReceipt} variant="outline" width="full">
              <Download size={16} /> Download receipt (PDF)
            </Button>

            {state.kind === 'loading' && (
              <Stack gap={3}>
                <Skeleton height="16px" width="66%" />
                <Skeleton height="16px" width="50%" />
                <Skeleton height="16px" width="75%" />
              </Stack>
            )}

            {state.kind === 'error' && (
              <Text fontSize="sm" color="fg.muted">
                Couldn&apos;t load the booking summary — but your reference code above is what
                we&apos;ll need. Please keep it handy.
              </Text>
            )}

            {state.kind === 'ok' && (
              <>
                <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                  <Summary label="Service" value={state.data.service?.name ?? '—'} />
                  <Summary
                    label="Date"
                    value={new Date(state.data.booking_date).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  />
                  <Summary label="Time" value={formatTimeLabel(state.data.booking_time)} />
                  <Summary label="Status" value={STATUS_LABELS[state.data.status]} />
                  <Summary
                    label="Route"
                    value={`${state.data.pickup_city} → ${state.data.dropoff_city}`}
                    full
                  />
                </SimpleGrid>

                <Box>
                  <Text mb={2} fontSize="xs" textTransform="uppercase" letterSpacing="wide" color="fg.muted">
                    Add to your calendar
                  </Text>
                  <Flex direction={{ base: 'column', sm: 'row' }} gap={2}>
                    <Button asChild variant="outline" flex={1}>
                      <a
                        href={googleCalendarUrl(eventFor(state.data))}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <CalendarPlus size={16} /> Google Calendar
                      </a>
                    </Button>
                    <Button onClick={() => downloadIcs(state.data)} variant="outline" flex={1}>
                      <Download size={16} /> Apple / Outlook (.ics)
                    </Button>
                  </Flex>
                </Box>
              </>
            )}

            <Flex direction={{ base: 'column', sm: 'row' }} gap={2} borderTopWidth="1px" pt={5}>
              <Button asChild flex={1} colorPalette="brand">
                <a href={telUrl()}>
                  <Phone size={16} /> Call us
                </a>
              </Button>
              <Button asChild flex={1} colorPalette="green">
                <a
                  href={whatsappUrl(`Hi! My booking ref is ${ref}. `)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={16} /> WhatsApp us
                </a>
              </Button>
            </Flex>
          </Stack>
        </Card.Body>
      </Card.Root>

      <Text mt={6} textAlign="center" fontSize="sm">
        <NextLink href="/booking-status" style={{ textDecoration: 'underline' }}>
          Track / manage your booking
        </NextLink>
      </Text>

      <Text mt={3} textAlign="center" fontSize="xs" color="fg.muted">
        Tip: take a screenshot of this page in case you need it later.
      </Text>
    </Box>
  );
}

function Summary({
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
