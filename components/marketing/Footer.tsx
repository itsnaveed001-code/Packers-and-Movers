import NextLink from 'next/link';
import {
  Box,
  Container,
  SimpleGrid,
  Stack,
  HStack,
  Flex,
  Heading,
  Text,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { Truck, Phone, Mail, MapPin } from 'lucide-react';
import { getSiteSettings, getServiceAreas } from '@/lib/cms';
import { BUSINESS, PRIMARY_CITY, SERVICE_AREAS as FALLBACK_AREAS } from '@/lib/constants';

const SERVICE_LINKS = [
  { href: '/services/home-shifting', label: 'Home shifting' },
  { href: '/services/office-shifting', label: 'Office shifting' },
  { href: '/services/vehicle-transport', label: 'Vehicle transport' },
  { href: '/services/intercity-moves', label: 'Intercity moves' },
  { href: '/services/storage', label: 'Storage' },
];

export async function Footer() {
  const [settings, areas] = await Promise.all([
    getSiteSettings(),
    getServiceAreas(),
  ]);

  const name = settings?.company_name ?? BUSINESS.name;
  const phone = settings?.phone ?? BUSINESS.phone;
  const email = settings?.email ?? BUSINESS.email;
  const address = settings?.address ?? BUSINESS.address;
  const tagline = settings?.tagline ?? BUSINESS.tagline;
  const footerText = settings?.footer_text;

  const areaNames =
    areas.length > 0 ? areas.map((a) => a.name) : (FALLBACK_AREAS as readonly string[]);
  const areaPreview = areaNames.slice(0, 6).join(', ');

  const year = new Date().getFullYear();
  return (
    <Box as="footer" bg="brand.900" color="brand.50" borderTopWidth="1px">
      <Container maxW="7xl" py={12}>
        <SimpleGrid columns={{ base: 1, md: 4 }} gap={10}>
          <Stack gap={3}>
            <ChakraLink asChild color="white" _hover={{ textDecoration: 'none' }}>
              <NextLink href="/">
                <HStack gap={2}>
                  <Truck size={22} />
                  <Text fontSize="lg" fontWeight="semibold">
                    {name}
                  </Text>
                </HStack>
              </NextLink>
            </ChakraLink>
            <Text fontSize="sm" color="brand.100" opacity={0.85}>
              {tagline}.
            </Text>
            {footerText ? (
              <Text fontSize="xs" color="brand.100" opacity={0.7} mt={1}>
                {footerText}
              </Text>
            ) : null}
          </Stack>

          <Box>
            <Heading as="h4" size="sm" color="white" mb={3}>
              Services
            </Heading>
            <Stack as="ul" gap={1.5} listStyleType="none">
              {SERVICE_LINKS.map((s) => (
                <li key={s.href}>
                  <ChakraLink
                    asChild
                    fontSize="sm"
                    color="brand.100"
                    _hover={{ color: 'white' }}
                  >
                    <NextLink href={s.href}>{s.label}</NextLink>
                  </ChakraLink>
                </li>
              ))}
            </Stack>
          </Box>

          <Box>
            <Heading as="h4" size="sm" color="white" mb={3}>
              Service Areas
            </Heading>
            <Text fontSize="sm" color="brand.100" opacity={0.85}>
              Serving all of {PRIMARY_CITY} — including {areaPreview}, and more.
            </Text>
          </Box>

          <Box>
            <Heading as="h4" size="sm" color="white" mb={3}>
              Get in touch
            </Heading>
            <Stack gap={2} fontSize="sm" color="brand.100">
              <HStack align="start" gap={2}>
                <Box pt="2px">
                  <Phone size={16} />
                </Box>
                <ChakraLink
                  href={`tel:${phone.replace(/\s/g, '')}`}
                  color="brand.100"
                  _hover={{ color: 'white' }}
                >
                  {phone}
                </ChakraLink>
              </HStack>
              <HStack align="start" gap={2}>
                <Box pt="2px">
                  <Mail size={16} />
                </Box>
                <ChakraLink
                  href={`mailto:${email}`}
                  color="brand.100"
                  _hover={{ color: 'white' }}
                >
                  {email}
                </ChakraLink>
              </HStack>
              <HStack align="start" gap={2}>
                <Box pt="2px">
                  <MapPin size={16} />
                </Box>
                <Text>{address}</Text>
              </HStack>
            </Stack>
          </Box>
        </SimpleGrid>

        <Flex
          mt={10}
          pt={6}
          borderTopWidth="1px"
          borderColor="brand.800"
          direction={{ base: 'column', md: 'row' }}
          align="center"
          justify="space-between"
          gap={3}
          fontSize="xs"
          color="brand.100"
        >
          <Text opacity={0.7}>
            © {year} {name}. All rights reserved.
          </Text>
          <HStack gap={4} opacity={0.85}>
            <ChakraLink asChild _hover={{ color: 'white' }}>
              <NextLink href="/contact">Contact</NextLink>
            </ChakraLink>
            <ChakraLink asChild _hover={{ color: 'white' }}>
              <NextLink href="/about">About</NextLink>
            </ChakraLink>
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
}
