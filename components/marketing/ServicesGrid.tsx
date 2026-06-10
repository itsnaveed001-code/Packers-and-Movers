import NextLink from 'next/link';
import {
  Box,
  Container,
  SimpleGrid,
  Heading,
  Text,
  Flex,
  HStack,
  Badge,
  Link as ChakraLink,
} from '@chakra-ui/react';
import {
  ArrowRight,
  Truck,
  Home,
  Car,
  Package,
  Route,
  Building2,
  Lock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Service } from '@/types/database';
import { isComingSoon, PRIMARY_CITY } from '@/lib/constants';
import { glassCard } from '@/theme/glass';

const ICONS: Record<string, LucideIcon> = {
  truck: Truck,
  home: Home,
  car: Car,
  package: Package,
  route: Route,
  'building-2': Building2,
};

function ServiceIcon({ name }: { name: string }) {
  const Icon = ICONS[name] || Truck;
  return <Icon size={24} />;
}

function ServiceCard({ service, soon }: { service: Service; soon: boolean }) {
  return (
    <Box
      h="full"
      rounded="2xl"
      p={6}
      opacity={soon ? 0.75 : 1}
      transition="box-shadow 0.2s, border-color 0.2s"
      {...glassCard}
      _hover={soon ? undefined : { shadow: 'md', borderColor: 'brand.300' }}
    >
      <Flex mb={4} align="center" justify="space-between">
        <Flex
          align="center"
          justify="center"
          h={12}
          w={12}
          rounded="xl"
          bg="brand.50"
          color="brand.600"
        >
          <ServiceIcon name={service.icon_name} />
        </Flex>
        {soon && (
          <Badge colorPalette="gray" variant="subtle" rounded="full" px={2.5} py={1}>
            <Lock size={12} /> Coming soon
          </Badge>
        )}
      </Flex>
      <Heading as="h3" fontSize="lg" fontWeight="semibold">
        {service.name}
      </Heading>
      <Text mt={1.5} fontSize="sm" color="fg.muted">
        {service.short_description}
      </Text>
      {soon ? (
        <Text mt={4} fontSize="sm" fontWeight="medium" color="fg.muted">
          Launching in {PRIMARY_CITY} soon
        </Text>
      ) : (
        <HStack mt={4} gap={1} fontSize="sm" fontWeight="medium" color="brand.700">
          Learn more <ArrowRight size={16} />
        </HStack>
      )}
    </Box>
  );
}

export function ServicesGrid({ services }: { services: Service[] }) {
  return (
    <Box as="section" py={{ base: 16, sm: 20 }}>
      <Container maxW="7xl">
        <Box maxW="2xl" mx="auto" textAlign="center">
          <Heading as="h2" fontSize={{ base: '3xl', sm: '4xl' }} letterSpacing="tight">
            Services we offer
          </Heading>
          <Text mt={3} color="fg.muted">
            From single-room moves to multi-city office relocations — we have you covered.
          </Text>
        </Box>

        <SimpleGrid mt={12} columns={{ base: 1, sm: 2, lg: 3 }} gap={5}>
          {services.map((service) => {
            const soon = isComingSoon(service.slug);
            if (soon) {
              return (
                <Box key={service.id} aria-disabled="true" cursor="not-allowed">
                  <ServiceCard service={service} soon />
                </Box>
              );
            }
            return (
              <ChakraLink
                key={service.id}
                asChild
                _hover={{ textDecoration: 'none' }}
                display="block"
                h="full"
              >
                <NextLink href={`/services/${service.slug}`}>
                  <ServiceCard service={service} soon={false} />
                </NextLink>
              </ChakraLink>
            );
          })}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
