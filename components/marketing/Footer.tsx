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
import { BUSINESS, PRIMARY_CITY, SERVICE_AREAS } from '@/lib/constants';

const SERVICE_LINKS = [
  { href: '/services/home-shifting', label: 'Home shifting' },
  { href: '/services/office-shifting', label: 'Office shifting' },
  { href: '/services/vehicle-transport', label: 'Vehicle transport' },
  { href: '/services/intercity-moves', label: 'Intercity moves' },
  { href: '/services/storage', label: 'Storage' },
];

export function Footer() {
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
                    {BUSINESS.name}
                  </Text>
                </HStack>
              </NextLink>
            </ChakraLink>
            <Text fontSize="sm" color="brand.100" opacity={0.85}>
              {BUSINESS.tagline}.
            </Text>
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
              Serving all of {PRIMARY_CITY} — including{' '}
              {SERVICE_AREAS.slice(0, 6).join(', ')}, and more.
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
                  href={`tel:${BUSINESS.phone.replace(/\s/g, '')}`}
                  color="brand.100"
                  _hover={{ color: 'white' }}
                >
                  {BUSINESS.phone}
                </ChakraLink>
              </HStack>
              <HStack align="start" gap={2}>
                <Box pt="2px">
                  <Mail size={16} />
                </Box>
                <ChakraLink
                  href={`mailto:${BUSINESS.email}`}
                  color="brand.100"
                  _hover={{ color: 'white' }}
                >
                  {BUSINESS.email}
                </ChakraLink>
              </HStack>
              <HStack align="start" gap={2}>
                <Box pt="2px">
                  <MapPin size={16} />
                </Box>
                <Text>{BUSINESS.address}</Text>
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
            © {year} {BUSINESS.name}. All rights reserved.
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
