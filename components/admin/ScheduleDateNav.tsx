'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function addDays(yyyyMmDd: string, n: number): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ScheduleDateNav({ date }: { date: string }) {
  const router = useRouter();

  function go(newDate: string) {
    router.push(`/admin/schedule?d=${newDate}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => go(addDays(date, -1))}
        aria-label="Previous day"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => go(todayISO())}
      >
        Today
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => go(addDays(date, 1))}
        aria-label="Next day"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Input
        type="date"
        value={date}
        onChange={(e) => {
          const v = e.target.value;
          if (/^\d{4}-\d{2}-\d{2}$/.test(v)) go(v);
        }}
        className="h-9 w-[160px]"
      />
    </div>
  );
}
