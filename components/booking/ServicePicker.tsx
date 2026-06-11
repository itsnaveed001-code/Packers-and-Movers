'use client';

import { chakra, SimpleGrid, Box, Flex, Text, HStack } from '@chakra-ui/react';
import { Truck, Home, Car, Package, Route, Building2, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Service } from '@/types/database';
import { formatINR } from '@/lib/utils';

const ICONS: Record<string, LucideIcon> = {
  truck: Truck,
  home: Home,
  car: Car,
  package: Package,
  route: Route,
  'building-2': Building2,
};

export function ServicePicker({
  services,
  selectedId,
  onSelect,
}: {
  services: Service[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
      {services.map((service) => {
        const Icon = ICONS[service.icon_name] || Truck;
        const selected = service.id === selectedId;
        const soon = service.coming_soon;
        return (
          <chakra.button
            key={service.id}
            type="button"
            disabled={soon}
            onClick={() => {
              if (!soon) onSelect(service.id);
            }}
            aria-pressed={selected}
            aria-disabled={soon}
            display="flex"
            alignItems="flex-start"
            gap={3}
            rounded="xl"
            borderWidth="1px"
            bg="white"
            p={4}
            textAlign="left"
            shadow="sm"
            transition="all 0.15s"
            borderColor={selected ? 'brand.600' : 'border'}
            boxShadow={selected ? '0 0 0 3px rgba(70, 103, 156, 0.30)' : undefined}
            cursor={soon ? 'not-allowed' : 'pointer'}
            opacity={soon ? 0.6 : 1}
            _hover={soon ? undefined : { borderColor: 'brand.300', shadow: 'md' }}
            _focusVisible={{ outline: '2px solid', outlineColor: 'brand.500', outlineOffset: '2px' }}
          >
            <Flex
              align="center"
              justify="center"
              h={10}
              w={10}
              flexShrink={0}
              rounded="lg"
              bg={selected ? 'brand.100' : 'brand.50'}
              color="brand.600"
            >
              <Icon size={20} />
            </Flex>
            <Box minW={0} flex={1}>
              <HStack gap={2}>
                <Text fontWeight="semibold">{service.name}</Text>
                {soon && (
                  <HStack
                    gap={1}
                    rounded="full"
                    bg="bg.subtle"
                    px={2}
                    py={0.5}
                    fontSize="10px"
                    fontWeight="medium"
                    color="fg.muted"
                  >
                    <Lock size={10} /> Soon
                  </HStack>
                )}
              </HStack>
              <Text mt={0.5} fontSize="sm" color="fg.muted" lineClamp={2}>
                {service.short_description}
              </Text>
              <Text mt={1.5} fontSize="xs" fontWeight="medium" color="brand.700">
                {soon
                  ? 'Coming soon'
                  : service.base_price != null
                    ? `From ${formatINR(service.base_price)}`
                    : 'Custom quote'}
              </Text>
            </Box>
          </chakra.button>
        );
      })}
    </SimpleGrid>
  );
}
