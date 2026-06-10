import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container, Text } from '@chakra-ui/react';
import { BookingConfirmedView } from '@/components/booking/BookingConfirmedView';

export const metadata: Metadata = {
  title: 'Booking confirmed',
  description: 'Your booking has been received. We will call you shortly to confirm.',
  robots: { index: false, follow: false },
};

export default function BookingConfirmedPage() {
  return (
    <Container maxW="7xl" py={{ base: 12, sm: 16 }}>
      <Suspense
        fallback={
          <Text textAlign="center" color="fg.muted">
            Loading…
          </Text>
        }
      >
        <BookingConfirmedView />
      </Suspense>
    </Container>
  );
}
