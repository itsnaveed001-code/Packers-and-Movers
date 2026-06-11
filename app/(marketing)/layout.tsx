import { Box, Flex } from '@chakra-ui/react';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { StickyMobileBar } from '@/components/marketing/StickyMobileBar';
import { getSiteSettings } from '@/lib/cms';
import { BUSINESS } from '@/lib/constants';

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Header is a client component (Drawer state), so settings come in via
  // props. Other (server) components call lib/cms directly — react cache()
  // dedupes getSiteSettings() across the request.
  const settings = await getSiteSettings();
  const companyName = settings?.company_name ?? BUSINESS.name;

  return (
    <Providers>
      <Flex direction="column" minH="100vh">
        <Header companyName={companyName} />
        <Box as="main" flex="1" pb={{ base: 16, md: 0 }}>
          {children}
        </Box>
        <StickyMobileBar />
        <Footer />
      </Flex>
    </Providers>
  );
}
