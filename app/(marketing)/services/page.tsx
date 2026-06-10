import { Box, Container, Heading, Text } from '@chakra-ui/react';
import { ServicesGrid } from '@/components/marketing/ServicesGrid';
import { getActiveServices } from '@/lib/queries';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Our services',
  description:
    'Full range of moving services — home shifting, office relocation, vehicle transport, intercity moves, and secure storage.',
  path: '/services',
});

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const services = await getActiveServices();
  return (
    <>
      <Box
        as="section"
        py={12}
        bgGradient="to-b"
        gradientFrom="brand.50"
        gradientTo="white"
      >
        <Container maxW="3xl">
          <Heading as="h1" fontSize={{ base: '4xl', sm: '5xl' }} letterSpacing="tight">
            Our services
          </Heading>
          <Text mt={3} color="fg.muted">
            Pick what you need — we&apos;ll handle the rest.
          </Text>
        </Container>
      </Box>
      <ServicesGrid services={services} />
    </>
  );
}
