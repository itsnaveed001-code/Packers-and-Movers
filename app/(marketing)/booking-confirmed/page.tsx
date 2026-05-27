import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BookingConfirmedView } from '@/components/booking/BookingConfirmedView';

export const metadata: Metadata = {
  title: 'Booking confirmed',
  description: 'Your booking has been received. We will call you shortly to confirm.',
  robots: { index: false, follow: false },
};

export default function BookingConfirmedPage() {
  return (
    <section className="container py-12 sm:py-16">
      <Suspense fallback={<p className="text-center text-muted-foreground">Loading…</p>}>
        <BookingConfirmedView />
      </Suspense>
    </section>
  );
}
