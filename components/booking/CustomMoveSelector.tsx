'use client';

import * as React from 'react';
import {
  Box,
  Button,
  chakra,
  Flex,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';
import { Minus, Plus } from 'lucide-react';
import {
  computeCustomPrice,
  CUSTOM_HOURS_MAX,
  CUSTOM_HOURS_MIN,
  CUSTOM_WORKERS_MAX,
  CUSTOM_WORKERS_MIN,
  DEFAULT_RATE_CARD,
  type CustomRateCard,
  type CustomSelection,
} from '@/lib/customPricing';
import { formatINR } from '@/lib/utils';

export const DEFAULT_CUSTOM_SELECTION: CustomSelection = {
  workers: 2,
  vehicle: DEFAULT_RATE_CARD.vehicles[0].id,
  hours: 4,
};

function Stepper({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <Box rounded="xl" borderWidth="1px" bg="white" p={4}>
      <Text fontSize="xs" textTransform="uppercase" letterSpacing="wide" color="fg.muted">
        {label}
      </Text>
      <Flex mt={2} align="center" justify="space-between" gap={2}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Fewer ${unit}`}
        >
          <Minus size={14} />
        </Button>
        <Text fontWeight="semibold" fontSize="lg" minW="80px" textAlign="center">
          {value} {unit}
        </Text>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`More ${unit}`}
        >
          <Plus size={14} />
        </Button>
      </Flex>
    </Box>
  );
}

/**
 * Custom-move resource picker: workers stepper (2–8), vehicle select,
 * estimated hours stepper, with a live indicative price from the rate
 * card. Shown in the booking wizard when the `custom` service is chosen.
 */
export function CustomMoveSelector({
  value,
  onChange,
  rateCard = DEFAULT_RATE_CARD,
}: {
  value: CustomSelection;
  onChange: (v: CustomSelection) => void;
  rateCard?: CustomRateCard;
}) {
  const price = computeCustomPrice(value, rateCard);

  return (
    <Box rounded="xl" borderWidth="1px" bg="bg.subtle" p={{ base: 4, sm: 5 }}>
      <Text fontSize="sm" fontWeight="semibold">
        Build your move
      </Text>
      <Text mt={0.5} fontSize="sm" color="fg.muted">
        Pick the crew, vehicle, and roughly how long you think the job will take.
      </Text>

      <Stack mt={4} gap={3}>
        <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
          <Stepper
            label="Movers"
            value={value.workers}
            min={CUSTOM_WORKERS_MIN}
            max={CUSTOM_WORKERS_MAX}
            unit="workers"
            onChange={(workers) => onChange({ ...value, workers })}
          />
          <Stepper
            label="Estimated duration"
            value={value.hours}
            min={CUSTOM_HOURS_MIN}
            max={CUSTOM_HOURS_MAX}
            unit="hours"
            onChange={(hours) => onChange({ ...value, hours })}
          />
        </SimpleGrid>

        <Box rounded="xl" borderWidth="1px" bg="white" p={4}>
          <Text fontSize="xs" textTransform="uppercase" letterSpacing="wide" color="fg.muted">
            Vehicle
          </Text>
          <chakra.select
            mt={2}
            value={value.vehicle}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onChange({ ...value, vehicle: e.target.value })
            }
            w="full"
            rounded="md"
            borderWidth="1px"
            px={3}
            py={2}
            fontSize="sm"
            bg="white"
          >
            {rateCard.vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label} — {formatINR(v.ratePaise)}
              </option>
            ))}
          </chakra.select>
        </Box>

        <Flex
          align="center"
          justify="space-between"
          rounded="xl"
          borderWidth="1px"
          borderColor="brand.200"
          bg="brand.50"
          px={4}
          py={3}
        >
          <Box>
            <Text fontSize="xs" textTransform="uppercase" letterSpacing="wide" color="brand.700">
              Indicative price
            </Text>
            <Text fontSize="xs" color="fg.muted">
              Final quote confirmed on call — no payment now.
            </Text>
          </Box>
          <Text fontSize="2xl" fontWeight="bold" color="brand.700">
            {price != null ? formatINR(price) : '—'}
          </Text>
        </Flex>
      </Stack>
    </Box>
  );
}
