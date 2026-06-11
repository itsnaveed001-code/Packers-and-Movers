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
import {
  getServiceIncludes,
  getServiceFaqs,
  getServicePricingTiers,
  getServiceFromPrice,
} from '@/lib/cms';
import { formatINR, whatsappUrl } from '@/lib/utils';
import { PRIMARY_CITY } from '@/lib/constants';
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

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const [includes, faqs, tiers, fromPrice] = await Promise.all([
    getServiceIncludes(service.id),
    getServiceFaqs(service.id),
    getServicePricingTiers(service.id),
    getServiceFromPrice(service.id),
  ]);

  const soon = service.coming_soon;

  // Bug #2 fix: "Starting from" should derive from the lowest pricing tier
  // when tiers exist (so the headline can't contradict the table). Falls
  // back to services.base_price when there are no tiers.
  const startingFromPaise = fromPrice ?? service.base_price;

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
                {startingFromPaise != null && (
                  <Text fontSize="sm" color="fg.muted">
                    Starting from{' '}
                    <Text as="span" fontWeight="semibold" color="fg">
                      {formatINR(startingFromPaise)}
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
                    <Table.Row key={t.id}>
                      <Table.Cell>
                        <Text fontWeight="medium">{t.label}</Text>
                        {t.sublabel ? (
                          <Text fontSize="xs" color="fg.muted">
                            {t.sublabel}
                          </Text>
                        ) : null}
                      </Table.Cell>
                      <Table.Cell fontWeight="semibold" color="brand.700">
                        ₹{Math.round(t.price / 100).toLocaleString('en-IN')}
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
                <HStack key={item.id} align="start" gap={2} fontSize="sm">
                  <Box color="green.600" flexShrink={0} pt="2px">
                    <CheckCircle2 size={20} />
                  </Box>
                  <Text>{item.item}</Text>
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
                  <Accordion.Item key={f.id} value={`item-${i}`}>
                    <Accordion.ItemTrigger cursor="pointer" py={4} fontWeight="medium">
                      <Box flex="1" textAlign="start">
                        {f.question}
                      </Box>
                      <Accordion.ItemIndicator />
                    </Accordion.ItemTrigger>
                    <Accordion.ItemContent>
                      <Accordion.ItemBody pb={4} color="fg.muted">
                        {f.answer}
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
