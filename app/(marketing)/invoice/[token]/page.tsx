import { notFound } from 'next/navigation';
import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react';
import { InvoiceView } from '@/components/marketing/InvoiceView';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { loadInvoiceByToken } from '@/lib/invoicesServer';
import { invoiceTokenSchema } from '@/lib/validation';
import { getRazorpayKeyId, paymentsEnabled } from '@/lib/razorpay';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

// Public payment page. The token in the URL is the only credential — it
// is 32 random bytes (64 hex chars) and only the customer who got the
// emailed link should have it. The page renders nothing identifying
// about the booking owner beyond the first name on the booking, so a
// leaked link does not expose contact details (no phone, no email).
export const metadata = pageMetadata({
  title: 'Pay invoice',
  description: 'Pay your EasyShiftX invoice securely online.',
  path: '/invoice',
  noindex: true,
});

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const parsed = invoiceTokenSchema.safeParse(token);
  if (!parsed.success) notFound();

  const supabase = createSupabaseAdminClient();
  const data = await loadInvoiceByToken(supabase, parsed.data);
  if (!data) notFound();

  const razorpay = paymentsEnabled()
    ? { enabled: true, keyId: getRazorpayKeyId() }
    : { enabled: false, keyId: null as string | null };

  return (
    <Box as="section" bg="bg.subtle" py={{ base: 8, sm: 12 }}>
      <Container maxW="3xl">
        <Stack gap={6}>
          <Box textAlign="center">
            <Heading
              as="h1"
              fontSize={{ base: '2xl', sm: '3xl' }}
              letterSpacing="tight"
            >
              Invoice
            </Heading>
            <Text mt={1} fontSize={{ base: 'sm', sm: 'md' }} color="fg.muted">
              Booking reference{' '}
              <Text as="span" fontWeight="semibold" color="fg">
                {data.booking.reference_code}
              </Text>
            </Text>
          </Box>
          <InvoiceView
            token={parsed.data}
            invoice={{
              id: data.id,
              amount_paise: data.amount_paise,
              line_items: data.line_items,
              notes: data.notes,
              status: data.status,
              paid_at: data.paid_at,
              received_at: data.received_at,
            }}
            booking={{
              reference_code: data.booking.reference_code,
              service_name: data.booking.service?.name ?? null,
              booking_date: data.booking.booking_date,
              booking_time: data.booking.booking_time,
              pickup_city: data.booking.pickup_city,
              dropoff_city: data.booking.dropoff_city,
              customer_name: data.booking.customer_name,
            }}
            razorpay={razorpay}
          />
        </Stack>
      </Container>
    </Box>
  );
}
