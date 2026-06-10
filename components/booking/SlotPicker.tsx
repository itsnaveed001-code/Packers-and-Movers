'use client';

import * as React from 'react';
import { chakra, Box, Text, SimpleGrid, Skeleton } from '@chakra-ui/react';

export type Slot = {
  time: string;
  label: string;
  available: boolean;
  tooSoon: boolean;
};

type FetchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'empty'; reason: 'past' | 'non_working' | 'blocked' }
  | { kind: 'ok'; slots: Slot[] }
  | { kind: 'error' };

function Notice({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'error' }) {
  return (
    <Box
      rounded="xl"
      borderWidth="1px"
      borderColor={tone === 'error' ? 'red.200' : 'border'}
      bg={tone === 'error' ? 'red.50' : 'bg.subtle'}
      p={6}
      textAlign="center"
      fontSize="sm"
      color={tone === 'error' ? 'red.600' : 'fg.muted'}
    >
      {children}
    </Box>
  );
}

export function SlotPicker({
  date,
  serviceId,
  selectedTime,
  onSelect,
}: {
  date: string | null;
  serviceId: string | null;
  selectedTime: string | null;
  onSelect: (time: string) => void;
}) {
  const [state, setState] = React.useState<FetchState>({ kind: 'idle' });

  React.useEffect(() => {
    if (!date) {
      setState({ kind: 'idle' });
      return;
    }
    let cancelled = false;
    setState({ kind: 'loading' });
    const params = new URLSearchParams({ date });
    if (serviceId) params.set('service_id', serviceId);
    fetch(`/api/slots?${params.toString()}`, { cache: 'no-store' })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setState({ kind: 'error' });
          return;
        }
        const body = (await res.json()) as
          | { slots: Slot[] }
          | { slots: []; reason: 'past' | 'non_working' | 'blocked' };
        if ('reason' in body) {
          setState({ kind: 'empty', reason: body.reason });
        } else {
          setState({ kind: 'ok', slots: body.slots });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [date, serviceId]);

  if (state.kind === 'idle') {
    return <Notice>Pick a date first.</Notice>;
  }

  if (state.kind === 'loading') {
    return (
      <SimpleGrid columns={{ base: 3, sm: 4 }} gap={2}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height="48px" rounded="lg" />
        ))}
      </SimpleGrid>
    );
  }

  if (state.kind === 'error') {
    return <Notice tone="error">Couldn&apos;t load slots. Please try again.</Notice>;
  }

  if (state.kind === 'empty') {
    const msg =
      state.reason === 'blocked'
        ? 'We are closed on this date. Please pick another.'
        : state.reason === 'non_working'
          ? 'No slots available on this day of the week.'
          : 'This date is in the past.';
    return <Notice>{msg}</Notice>;
  }

  if (state.slots.length === 0) {
    return <Notice>No slots configured for this date.</Notice>;
  }

  const anyAvailable = state.slots.some((s) => s.available);

  return (
    <Box>
      <SimpleGrid columns={{ base: 3, sm: 4 }} gap={2}>
        {state.slots.map((slot) => {
          const isSelected = selectedTime === slot.time;
          const disabled = !slot.available;
          return (
            <chakra.button
              key={slot.time}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(slot.time)}
              aria-pressed={isSelected}
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              h={12}
              rounded="lg"
              borderWidth="1px"
              bg={isSelected ? 'brand.50' : disabled ? 'bg.subtle' : 'white'}
              borderColor={isSelected ? 'brand.600' : 'border'}
              boxShadow={isSelected ? '0 0 0 3px rgba(70, 103, 156, 0.30)' : undefined}
              fontSize="sm"
              fontWeight="medium"
              color={disabled ? 'fg.muted' : 'fg'}
              cursor={disabled ? 'not-allowed' : 'pointer'}
              opacity={disabled ? 0.7 : 1}
              transition="all 0.15s"
              _hover={!disabled && !isSelected ? { borderColor: 'brand.300' } : undefined}
              _focusVisible={{ outline: '2px solid', outlineColor: 'brand.500', outlineOffset: '2px' }}
            >
              <Text as="span" textDecoration={disabled ? 'line-through' : undefined}>
                {slot.label}
              </Text>
              {disabled && (
                <Text as="span" fontSize="10px" fontWeight="normal" textTransform="uppercase" letterSpacing="wide">
                  {slot.tooSoon ? 'Too soon' : 'Booked'}
                </Text>
              )}
            </chakra.button>
          );
        })}
      </SimpleGrid>
      {!anyAvailable && (
        <Text mt={3} textAlign="center" fontSize="sm" color="fg.muted">
          All slots are taken on this date. Try another day.
        </Text>
      )}
    </Box>
  );
}
