import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  HStack,
  SimpleGrid,
  Button,
  Table,
  Accordion,
} from '@chakra-ui/react';
import { ArrowRight, CheckCircle2, Lock, MessageCircle } from 'lucide-react';
import { getServiceBySlug } from '@/lib/queries';
import { formatINR, whatsappUrl } from '@/lib/utils';
import { isComingSoon, HOUSE_SHIFTING_TIERS, PRIMARY_CITY } from '@/lib/constants';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return { title: 'Service not found' };
  return pageMetadata({
    title: service.name,
    description: service.short_description,
    path: `/services/${slug}`,
  });
}

const INCLUDED_BY_SLUG: Record<string, string[]> = {
  'home-shifting': [
    'Careful packing of every room with quality materials',
    'Dismantling and reassembly of furniture',
    'Loading, transit and unloading',
    'Unpacking and setup at destination',
    'Transit insurance available',
  ],
  'office-shifting': [
    'Site survey and move plan in advance',
    'IT equipment handling',
    'Weekend or after-hours slots',
    'Structured unpacking at destination',
    'Workstation reassembly',
  ],
  'vehicle-transport': [
    'Bike or car pickup from your address',
    'Enclosed or open carrier options',
    'GPS tracking through transit',
    'Insured against transit damage',
    'Door-to-door delivery',
  ],
  'local-moves': [
    'Same-day slots available',
    'Right-sized vehicles (tempo or mini-truck)',
    'Packing materials included',
    'Helpers for loading/unloading',
  ],
  'intercity-moves': [
    'Dedicated truck — no co-loading',
    'Scheduled delivery window',
    'Full transit insurance',
    'Real-time updates en route',
  ],
  storage: [
    'Clean, climate-stable facility',
    'CCTV monitored, 24/7 security',
    'Short and long-term options',
    'Easy pickup and drop scheduling',
  ],
};

const FAQS_BY_SLUG: Record<string, { q: string; a: string }[]> = {
  'home-shifting': [
    {
      q: 'How long does a home move take?',
      a: 'A typical 2BHK takes 6–8 hours end-to-end for a local move. Larger homes and intercity moves take longer; we share a detailed estimate after a quick chat.',
    },
    {
      q: 'Do you provide packing materials?',
      a: 'Yes — boxes, bubble wrap, stretch film, and tape are included in every home move.',
    },
    {
      q: 'What about my fragile items?',
      a: "We use double-walled boxes, custom crating for art and glass, and dedicated padding. We'll walk you through it before move day.",
    },
    {
      q: 'Is insurance included?',
      a: 'Optional transit insurance is available on every move and we strongly recommend it for high-value contents.',
    },
  ],
  'office-shifting': [
    {
      q: 'Can you move us over the weekend?',
      a: 'Yes — weekend and after-hours slots are designed exactly for this. Most offices choose Friday evening to Sunday.',
    },
    {
      q: 'Do you handle IT equipment?',
      a: 'Yes. We disconnect, label, transport, and reconnect workstations and routers. Server racks require a quick survey first.',
    },
    {
      q: 'How do you minimise downtime?',
      a: 'We plan the move in zones so critical teams are operational first thing Monday.',
    },
  ],
  'vehicle-transport': [
    {
      q: 'Will my vehicle pick up additional kilometres?',
      a: 'No. Vehicles are loaded onto the carrier — the odometer does not move during transit.',
    },
    {
      q: 'How long does intercity transport take?',
      a: 'Bengaluru to a nearby city is typically 1–2 days. Longer routes vary — we share a delivery window before booking.',
    },
    {
      q: 'Is the vehicle insured during transit?',
      a: 'Yes — transit insurance is included by default for vehicle transport.',
    },
  ],
  'local-moves': [
    {
      q: 'Do you offer same-day moves?',
      a: 'Subject to availability — book by 11 AM and we can usually arrange a same-day slot for small moves.',
    },
    {
      q: 'What size vehicle do I need?',
      a: "We'll recommend the right size after a quick call. Small (tempo), medium (407), or large (mini-truck).",
    },
    {
      q: 'Can I help with loading?',
      a: 'Absolutely. But our crew is included — no extra cost.',
    },
  ],
  'intercity-moves': [
    {
      q: 'Do you co-load with other customers?',
      a: 'No — every intercity move is on a dedicated vehicle. Your goods are not mixed with anyone else’s.',
    },
    {
      q: 'What are the delivery windows?',
      a: 'Typical metro-to-metro moves take 1–3 days. We commit to a window before you book.',
    },
    {
      q: 'How is pricing calculated?',
      a: 'Pricing depends on volume, distance, and floor access. We share a fixed quote — no per-kilometre surprises.',
    },
  ],
  storage: [
    {
      q: 'How is the storage facility secured?',
      a: '24/7 CCTV, security guards, and access control. Climate is stable year-round.',
    },
    {
      q: 'How is storage priced?',
      a: 'By volume per month. We share a fixed monthly rate after the inventory is confirmed.',
    },
    {
      q: 'Can you pick items up and drop them off?',
      a: 'Yes — scheduled pickup and delivery on request, added to your monthly bill.',
    },
  ],
};

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const includes = INCLUDED_BY_SLUG[service.slug] ?? [];
  const faqs = FAQS_BY_SLUG[service.slug] ?? [];
  const soon = isComingSoon(service.slug);
  const tiers = service.slug === 'home-shifting' ? HOUSE_SHIFTING_TIERS : [];

  return (
    <>
      <Box
        as="section"
        py={{ base: 16, sm: 20 }}
        bgGradient="to-b"
        gradientFrom="brand.50"
        gradientTo="white"
      >
        <Container maxW="3xl">
          <Text fontSize="sm" fontWeight="medium" color="brand.700">
            Services
          </Text>
          <Heading as="h1" mt={2} fontSize={{ base: '4xl', sm: '5xl' }} letterSpacing="tight">
            {service.name}
          </Heading>
          <Text mt={4} fontSize="lg" color="fg.muted">
            {service.description}
          </Text>

          <Stack mt={7} direction={{ base: 'column', sm: 'row' }} align={{ sm: 'center' }} gap={3}>
            {soon ? (
              <>
                <HStack
                  display="inline-flex"
                  gap={2}
                  rounded="lg"
                  bg="bg.subtle"
                  px={4}
                  py={2.5}
                  fontSize="sm"
                  fontWeight="medium"
                  color="fg.muted"
                >
                  <Lock size={16} /> Coming soon to {PRIMARY_CITY}
                </HStack>
                <Button asChild size="lg" colorPalette="green">
                  <a
                    href={whatsappUrl(`Hi! Please notify me when ${service.name} is available.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle size={16} /> Notify me
                  </a>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg" colorPalette="brand">
                  <NextLink href={`/book?service=${service.slug}`}>
                    Book this service <ArrowRight size={16} />
                  </NextLink>
                </Button>
                {service.base_price != null && (
                  <Text fontSize="sm" color="fg.muted">
                    Starting from{' '}
                    <Text as="span" fontWeight="semibold" color="fg">
                      {formatINR(service.base_price)}
                    </Text>
                  </Text>
                )}
              </>
            )}
          </Stack>
        </Container>
      </Box>

      {tiers.length > 0 && (
        <Box as="section" py={12}>
          <Container maxW="3xl">
            <Heading as="h2" fontSize="2xl" letterSpacing="tight">
              Indicative pricing
            </Heading>
            <Text mt={2} fontSize="sm" color="fg.muted">
              Starting prices by home size. Final price depends on distance, floor,
              and the exact items — we confirm a fixed quote before you pay.
            </Text>
            <Box mt={5} overflow="hidden" rounded="2xl" borderWidth="1px">
              <Table.Root size="md">
                <Table.Header bg="bg.subtle">
                  <Table.Row>
                    <Table.ColumnHeader fontWeight="semibold">Home size</Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="semibold">Starting from</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {tiers.map((t) => (
                    <Table.Row key={t.label}>
                      <Table.Cell>
                        <Text fontWeight="medium">{t.label}</Text>
                        <Text fontSize="xs" color="fg.muted">
                          {t.note}
                        </Text>
                      </Table.Cell>
                      <Table.Cell fontWeight="semibold" color="brand.700">
                        ₹{t.priceFrom.toLocaleString('en-IN')}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
            <Text mt={3} fontSize="xs" color="fg.muted">
              * Indicative starting prices. You&apos;ll get an exact quote on a quick call.
            </Text>
          </Container>
        </Box>
      )}

      {includes.length > 0 && (
        <Box as="section" py={12}>
          <Container maxW="3xl">
            <Heading as="h2" fontSize="2xl" letterSpacing="tight">
              What&apos;s included
            </Heading>
            <SimpleGrid mt={5} columns={{ base: 1, sm: 2 }} gap={3}>
              {includes.map((item) => (
                <HStack key={item} align="start" gap={2} fontSize="sm">
                  <Box color="green.600" flexShrink={0} pt="2px">
                    <CheckCircle2 size={20} />
                  </Box>
                  <Text>{item}</Text>
                </HStack>
              ))}
            </SimpleGrid>
          </Container>
        </Box>
      )}

      {faqs.length > 0 && (
        <Box as="section" bg="bg.subtle" py={12}>
          <Container maxW="3xl">
            <Heading as="h2" fontSize="2xl" letterSpacing="tight">
              Frequently asked
            </Heading>
            <Box mt={5} rounded="2xl" borderWidth="1px" bg="white" px={6}>
              <Accordion.Root collapsible defaultValue={['item-0']}>
                {faqs.map((f, i) => (
                  <Accordion.Item key={i} value={`item-${i}`}>
                    <Accordion.ItemTrigger cursor="pointer" py={4} fontWeight="medium">
                      <Box flex="1" textAlign="start">
                        {f.q}
                      </Box>
                      <Accordion.ItemIndicator />
                    </Accordion.ItemTrigger>
                    <Accordion.ItemContent>
                      <Accordion.ItemBody pb={4} color="fg.muted">
                        {f.a}
                      </Accordion.ItemBody>
                    </Accordion.ItemContent>
                  </Accordion.Item>
                ))}
              </Accordion.Root>
            </Box>
          </Container>
        </Box>
      )}

      <Box as="section" py={12}>
        <Container maxW="3xl" textAlign="center">
          {soon ? (
            <>
              <Heading as="h2" fontSize="2xl" letterSpacing="tight">
                {service.name} is launching soon in {PRIMARY_CITY}
              </Heading>
              <Text mt={2} color="fg.muted">
                Want it sooner? Message us and we&apos;ll prioritise your area.
              </Text>
              <Button asChild size="lg" colorPalette="green" mt={5}>
                <a
                  href={whatsappUrl(`Hi! Please notify me when ${service.name} is available.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={16} /> Notify me on WhatsApp
                </a>
              </Button>
            </>
          ) : (
            <>
              <Heading as="h2" fontSize="2xl" letterSpacing="tight">
                Ready to book your {service.name.toLowerCase()}?
              </Heading>
              <Text mt={2} color="fg.muted">
                It takes less than a minute.
              </Text>
              <Button asChild size="lg" colorPalette="brand" mt={5}>
                <NextLink href={`/book?service=${service.slug}`}>
                  Book now <ArrowRight size={16} />
                </NextLink>
              </Button>
            </>
          )}
        </Container>
      </Box>
    </>
  );
}
