import {
  Box,
  Container,
  SimpleGrid,
  Heading,
  Text,
  Stack,
  HStack,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { Phone, Mail, MessageCircle, MapPin, Clock } from 'lucide-react';
import { ContactForm } from '@/components/marketing/ContactForm';
import { getSiteSettings, getContentBlock } from '@/lib/cms';
import { BUSINESS, HOURS } from '@/lib/constants';
import { whatsappUrl } from '@/lib/utils';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = pageMetadata({
  title: 'Contact us',
  description: `Get in touch with ${BUSINESS.name}. Call, WhatsApp, or send us a message — we usually respond within a few hours.`,
  path: '/contact',
});

export default async function ContactPage() {
  const [settings, intro] = await Promise.all([
    getSiteSettings(),
    getContentBlock('contact', 'intro'),
  ]);

  const phone = settings?.phone ?? BUSINESS.phone;
  const email = settings?.email ?? BUSINESS.email;
  const address = settings?.address ?? BUSINESS.address;
  const hours = settings?.business_hours ?? HOURS;
  const weekdayHours = (hours as Record<string, string>).weekday ?? HOURS.weekday;
  const sundayHours = (hours as Record<string, string>).sunday ?? HOURS.sunday;

  const mapMode = settings?.map_mode ?? 'embed';
  const mapQuery = settings?.map_query ?? address;
  const mapsSrc = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;

  const introCopy =
    (intro?.value as string | undefined) ??
    "We're here to help with any question — large move or small. The fastest way is WhatsApp.";

  return (
    <>
      <Box
        as="section"
        py={16}
        bgGradient="to-b"
        gradientFrom="brand.50"
        gradientTo="white"
      >
        <Container maxW="5xl">
          <Heading as="h1" fontSize={{ base: '4xl', sm: '5xl' }} letterSpacing="tight">
            Contact us
          </Heading>
          <Text mt={3} maxW="2xl" color="fg.muted">
            {introCopy}
          </Text>
        </Container>
      </Box>

      <Box as="section" py={12}>
        <Container maxW="5xl">
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={10}>
            <Box>
              <Heading as="h2" fontSize="xl" fontWeight="semibold">
                Reach us directly
              </Heading>
              <Stack mt={4} gap={4} fontSize="sm">
                <ContactRow icon={Phone} label="Phone">
                  <ContactLink href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</ContactLink>
                </ContactRow>
                <ContactRow icon={MessageCircle} label="WhatsApp" iconColor="green.600">
                  <ContactLink href={whatsappUrl()} external color="green.700">
                    Chat with us
                  </ContactLink>
                </ContactRow>
                <ContactRow icon={Mail} label="Email">
                  <ContactLink href={`mailto:${email}`}>{email}</ContactLink>
                </ContactRow>
                <ContactRow icon={MapPin} label="Office">
                  <Text color="fg.muted">{address}</Text>
                </ContactRow>
                <ContactRow icon={Clock} label="Hours">
                  <Text color="fg.muted">Mon–Sat: {weekdayHours}</Text>
                  <Text color="fg.muted">Sun: {sundayHours}</Text>
                </ContactRow>
              </Stack>

              {mapMode === 'embed' ? (
                <Box mt={8} overflow="hidden" rounded="2xl" borderWidth="1px">
                  <iframe
                    title="Office location"
                    src={mapsSrc}
                    width="100%"
                    height="280"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    style={{ border: 0, display: 'block' }}
                  />
                </Box>
              ) : null}
            </Box>

            <Box rounded="2xl" borderWidth="1px" bg="white" p={6} shadow="sm">
              <Heading as="h2" fontSize="xl" fontWeight="semibold">
                Send us a message
              </Heading>
              <Text mt={1} fontSize="sm" color="fg.muted">
                We usually reply within a few hours during business hours.
              </Text>
              <Box mt={5}>
                <ContactForm />
              </Box>
            </Box>
          </SimpleGrid>
        </Container>
      </Box>
    </>
  );
}

function ContactRow({
  icon: Icon,
  label,
  iconColor = 'brand.600',
  children,
}: {
  icon: typeof Phone;
  label: string;
  iconColor?: string;
  children: React.ReactNode;
}) {
  return (
    <HStack align="start" gap={3}>
      <Box pt="2px" color={iconColor}>
        <Icon size={20} />
      </Box>
      <Box>
        <Text fontWeight="medium">{label}</Text>
        {children}
      </Box>
    </HStack>
  );
}

function ContactLink({
  href,
  external,
  color = 'brand.700',
  children,
}: {
  href: string;
  external?: boolean;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <ChakraLink
      href={href}
      color={color}
      _hover={{ textDecoration: 'underline' }}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </ChakraLink>
  );
}
