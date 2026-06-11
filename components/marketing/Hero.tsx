import NextLink from 'next/link';
import Image from 'next/image';
import {
  Box,
  Container,
  SimpleGrid,
  Stack,
  HStack,
  Wrap,
  WrapItem,
  Heading,
  Text,
  Button,
  Flex,
} from '@chakra-ui/react';
import { ArrowRight, MessageCircle, Shield } from 'lucide-react';
import { getSiteSettings, getHomeFeatures, getContentBlocksForPage } from '@/lib/cms';
import { BUSINESS, PRIMARY_CITY } from '@/lib/constants';
import { whatsappUrl } from '@/lib/utils';

export async function Hero() {
  const [settings, exampleCards, copy] = await Promise.all([
    getSiteSettings(),
    getHomeFeatures('example_card'),
    getContentBlocksForPage('home'),
  ]);

  const tagline = settings?.tagline ?? BUSINESS.tagline;
  const pill =
    (copy.hero_pill as string | undefined) ?? `Now serving all of ${PRIMARY_CITY}`;
  const heading =
    (copy.hero_heading as string | undefined) ??
    `Trusted Packers and Movers in ${PRIMARY_CITY}`;
  const subheading =
    (copy.hero_subheading as string | undefined) ??
    `${tagline}. Insured, on-time relocations with transparent pricing — book your slot online in under a minute.`;

  return (
    <Box
      as="section"
      position="relative"
      overflow="hidden"
      bgGradient="to-b"
      gradientFrom="brand.50"
      gradientTo="white"
    >
      <Container maxW="7xl" py={{ base: 12, sm: 20, lg: 24 }}>
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={10} alignItems="center">
          <Box>
            <HStack
              display="inline-flex"
              gap={1.5}
              rounded="full"
              bg="white"
              borderWidth="1px"
              px={3}
              py={1}
              fontSize="xs"
              fontWeight="medium"
              color="brand.700"
              shadow="sm"
            >
              <Box color="brand.600">
                <Shield size={14} />
              </Box>
              {pill}
            </HStack>

            <Heading
              as="h1"
              mt={4}
              fontSize={{ base: '4xl', sm: '5xl', lg: '6xl' }}
              fontWeight="bold"
              letterSpacing="tight"
              lineHeight="1.1"
            >
              {heading}
            </Heading>

            <Text mt={4} maxW="xl" fontSize={{ base: 'md', sm: 'lg' }} color="fg.muted">
              {subheading}
            </Text>

            <Stack mt={7} direction={{ base: 'column', sm: 'row' }} gap={3}>
              <Button asChild size="lg" colorPalette="brand">
                <NextLink href="/book">
                  Book Now <ArrowRight size={16} />
                </NextLink>
              </Button>
              <Button asChild size="lg" colorPalette="green" variant="solid">
                <a
                  href={whatsappUrl('Hi! I want a quote for moving.')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={16} /> WhatsApp Us
                </a>
              </Button>
            </Stack>

            <Wrap mt={7} gapX={6} gapY={2} fontSize="xs" color="fg.muted" align="center">
              <WrapItem>
                <HStack gap={1.5}>
                  <Box color="brand.600">
                    <Shield size={16} />
                  </Box>
                  Insured moves
                </HStack>
              </WrapItem>
              <WrapItem>•</WrapItem>
              <WrapItem>On-time guarantee</WrapItem>
              <WrapItem>•</WrapItem>
              <WrapItem>No hidden charges</WrapItem>
            </Wrap>
          </Box>

          <Box position="relative" display={{ base: 'none', lg: 'block' }}>
            <Box
              position="relative"
              aspectRatio="1"
              rounded="3xl"
              bgGradient="to-br"
              gradientFrom="brand.100"
              gradientTo="white"
              shadow="inner"
              overflow="hidden"
            >
              <Image
                src="/heroillustration.svg"
                alt="Illustration of a packing and moving crew"
                width={600}
                height={100}
                priority
              />
              <Stack
                position="absolute"
                inset={8}
                justify="flex-end"
                gap={4}
                rounded="2xl"
                p={6}
                shadow="lg"
                borderWidth="1px"
                borderColor="brand.100"
                bg="rgba(255,255,255,0.7)"
                backdropFilter="blur(4px)"
              >
                <Flex align="center" justify="space-between" borderBottomWidth="1px" pb={3}>
                  <Text fontSize="sm" fontWeight="semibold" color="brand.700">
                    Today&apos;s bookings
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    Live
                  </Text>
                </Flex>
                {exampleCards.length > 0
                  ? exampleCards.map((row) => {
                      // body = "Area → Area · Time" — split to show secondary line + chip.
                      const [areaPart, timePart] = (row.body ?? '').split(/\s+·\s+/);
                      return (
                        <Flex
                          key={row.id}
                          align="center"
                          justify="space-between"
                          fontSize="sm"
                        >
                          <Box>
                            <Text fontWeight="medium">{row.title}</Text>
                            <Text fontSize="xs" color="fg.muted">
                              {areaPart}
                            </Text>
                          </Box>
                          <Text
                            rounded="md"
                            bg="brand.50"
                            px={2}
                            py={1}
                            fontSize="xs"
                            fontWeight="medium"
                            color="brand.700"
                          >
                            {timePart ?? ''}
                          </Text>
                        </Flex>
                      );
                    })
                  : null}
              </Stack>
            </Box>
          </Box>
        </SimpleGrid>
      </Container>
    </Box>
  );
}
