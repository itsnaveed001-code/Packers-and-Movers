'use client';

import * as React from 'react';
import { Box, Text } from '@chakra-ui/react';
import { Calendar } from '@/components/ui/calendar';

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
    <Box rounded="xl" borderWidth="1px" bg="white" p={2}>
      {/* react-day-picker (shadcn Calendar) kept here intentionally — it is a
          third-party date picker, restyled to Chakra in Phase 5. */}
      <Calendar
        mode="single"
        selected={selected}
        onSelect={onSelect}
        disabled={disabled}
        weekStartsOn={1}
        fromDate={today}
        toDate={max}
      />
      <Text borderTopWidth="1px" px={3} py={2} fontSize="xs" color="fg.muted">
        Greyed-out dates are closed or fully booked.
      </Text>
    </Box>
  );
}
