import { Box, Container, Heading, Text } from '@chakra-ui/react';
import { MyBookings } from '@/components/marketing/MyBookings';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Track & manage your booking',
  description:
    'See the status of your move, view all your bookings, or cancel one — no account needed. Verify your email with a one-time code.',
  path: '/booking-status',
});

export const dynamic = 'force-dynamic';

export default function BookingStatusPage() {
  return (
    <Box as="section" bg="bg.subtle" py={{ base: 8, sm: 12 }}>
      <Container maxW="7xl">
        <Box mx="auto" mb={6} maxW="2xl" textAlign="center">
          <Heading as="h1" fontSize={{ base: '3xl', sm: '4xl' }} letterSpacing="tight">
            Track &amp; manage your booking
          </Heading>
          <Text mt={2} fontSize={{ base: 'sm', sm: 'md' }} color="fg.muted">
            No account needed — verify your email with a one-time code to see every
            booking under it, check status, and cancel if plans change.
          </Text>
        </Box>
        <MyBookings />
      </Container>
    </Box>
  );
}
