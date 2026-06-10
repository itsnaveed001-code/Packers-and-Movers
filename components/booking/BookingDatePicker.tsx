'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { Box, Text } from '@chakra-ui/react';

// Tailwind-free date picker: react-day-picker v9 with its own stylesheet, themed
// to the brand via its CSS variables. (The previous version wrapped the shadcn
// Calendar, which pulled Tailwind into the otherwise-Chakra marketing tree.)
export function BookingDatePicker({
  selected,
  onSelect,
  blockedDates,
  workingDays,
  maxAdvanceDays,
}: {
  selected: Date | undefined;
  onSelect: (d: Date | undefined) => void;
  blockedDates: string[]; // ISO YYYY-MM-DD
  workingDays: number[]; // 0..6, Sun=0
  maxAdvanceDays: number;
}) {
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const max = React.useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + maxAdvanceDays);
    return d;
  }, [today, maxAdvanceDays]);

  const blockedSet = React.useMemo(() => new Set(blockedDates), [blockedDates]);

  const disabled = React.useMemo(
    () => [
      { before: today },
      { after: max },
      (date: Date) => {
        if (!workingDays.includes(date.getDay())) return true;
        const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return blockedSet.has(iso);
      },
    ],
    [today, max, workingDays, blockedSet],
  );

  return (
    <Box
      rounded="xl"
      borderWidth="1px"
      bg="white"
      p={2}
      css={{
        '& .rdp-root': {
          '--rdp-accent-color': 'var(--chakra-colors-brand-600)',
          '--rdp-accent-background-color': 'var(--chakra-colors-brand-50)',
          '--rdp-day_button-border-radius': '0.5rem',
          '--rdp-today-color': 'var(--chakra-colors-brand-700)',
          margin: '0 auto',
          width: 'fit-content',
        },
        '& .rdp-disabled': { textDecoration: 'line-through', opacity: 0.45 },
        '& .rdp-day_button': { fontWeight: 400 },
      }}
    >
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
        disabled={disabled}
        weekStartsOn={1}
        startMonth={today}
        endMonth={max}
      />
      <Text borderTopWidth="1px" px={3} py={2} fontSize="xs" color="fg.muted">
        Greyed-out dates are closed or fully booked.
      </Text>
    </Box>
  );
}
