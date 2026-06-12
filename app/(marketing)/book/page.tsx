import { Suspense } from 'react';
import { Box, Container, Heading, Text } from '@chakra-ui/react';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getActiveServices } from '@/lib/queries';
import { DEFAULT_RATE_CARD, loadRateCard, type CustomRateCard } from '@/lib/customPricing';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Book your move',
  description:
    'Book your packers and movers slot online. Choose your service, date, time, and we will call you within 2 hours to confirm.',
  path: '/book',
});

export const dynamic = 'force-dynamic';

type Availability = {
  workingDays: number[];
  advanceBookingDays: number;
  blockedDates: string[];
};

const DEFAULT_AVAILABILITY: Availability = {
  workingDays: [1, 2, 3, 4, 5, 6],
  advanceBookingDays: 60,
  blockedDates: [],
};

async function getAvailability(): Promise<Availability> {
  // Never let a Supabase/env failure crash the whole /book route. If the
  // database is unreachable we fall back to sensible defaults; the page then
  // degrades gracefully instead of throwing a server-side exception.
  try {
    const supabase = createSupabaseAdminClient();
    const [settingsRes, blockedRes] = await Promise.all([
      supabase.from('availability_settings').select('*').maybeSingle(),
      supabase
        .from('blocked_dates')
        .select('date')
        .gte('date', new Date().toISOString().slice(0, 10)),
    ]);
    return {
      workingDays: settingsRes.data?.working_days ?? DEFAULT_AVAILABILITY.workingDays,
      advanceBookingDays:
        settingsRes.data?.advance_booking_days ?? DEFAULT_AVAILABILITY.advanceBookingDays,
      blockedDates: (blockedRes.data ?? []).map((b) => b.date),
    };
  } catch (err) {
    console.error('[book] getAvailability failed, using defaults:', err);
    return DEFAULT_AVAILABILITY;
  }
}

async function getRateCard(): Promise<CustomRateCard> {
  try {
    return await loadRateCard(createSupabaseAdminClient());
  } catch {
    return DEFAULT_RATE_CARD;
  }
}

export default async function BookPage() {
  const [services, availability, rateCard] = await Promise.all([
    getActiveServices(),
    getAvailability(),
    getRateCard(),
  ]);

  return (
    <Box as="section" bg="bg.subtle" py={{ base: 8, sm: 12 }}>
      <Container maxW="7xl">
        <Box mx="auto" mb={6} maxW="3xl" textAlign="center">
          <Heading as="h1" fontSize={{ base: '3xl', sm: '4xl' }} letterSpacing="tight">
            Book your move
          </Heading>
          <Text mt={2} fontSize={{ base: 'sm', sm: 'md' }} color="fg.muted">
            Five quick steps. No payment now — pay on the day of service.
          </Text>
        </Box>
        {services.length === 0 ? (
          <Box
            mx="auto"
            maxW="3xl"
            rounded="xl"
            borderWidth="1px"
            borderColor="orange.200"
            bg="orange.50"
            p={4}
            fontSize="sm"
            color="orange.900"
          >
            Booking is temporarily unavailable. Please call or WhatsApp us instead.
          </Box>
        ) : (
          <Suspense
            fallback={
              <Text mx="auto" maxW="3xl" textAlign="center" fontSize="sm" color="fg.muted">
                Loading…
              </Text>
            }
          >
            <BookingFlow
              services={services}
              availability={availability}
              rateCard={rateCard}
            />
          </Suspense>
        )}
      </Container>
    </Box>
  );
}
