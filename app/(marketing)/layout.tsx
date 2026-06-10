import { Box, Flex } from '@chakra-ui/react';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { StickyMobileBar } from '@/components/marketing/StickyMobileBar';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <Flex direction="column" minH="100vh">
        <Header />
        <Box as="main" flex="1" pb={{ base: 16, md: 0 }}>
          {children}
        </Box>
        <StickyMobileBar />
        <Footer />
      </Flex>
    </Providers>
  );
}
