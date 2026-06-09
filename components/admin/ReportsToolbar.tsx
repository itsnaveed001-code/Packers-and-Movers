'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PRESETS = [
  { label: '7 days', days: 6 },
  { label: '30 days', days: 29 },
  { label: '90 days', days: 89 },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ReportsToolbar({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [localFrom, setLocalFrom] = React.useState(from);
  const [localTo, setLocalTo] = React.useState(to);

  React.useEffect(() => {
    setLocalFrom(from);
    setLocalTo(to);
  }, [from, to]);

  function apply(newFrom: string, newTo: string) {
    router.push(`/admin/reports?from=${newFrom}&to=${newTo}`);
  }

  function preset(days: number) {
    const t = todayISO();
    const f = shiftISO(t, -days);
    apply(f, t);
  }

  function csvHref(): string {
    return `/api/admin/bookings/export?from=${localFrom}&to=${localTo}`;
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="from" className="text-xs text-muted-foreground">
            From
          </Label>
          <Input
            id="from"
            type="date"
            value={localFrom}
            onChange={(e) => setLocalFrom(e.target.value)}
            className="mt-1 h-9 w-[160px]"
          />
        </div>
        <div>
          <Label htmlFor="to" className="text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id="to"
            type="date"
            value={localTo}
            onChange={(e) => setLocalTo(e.target.value)}
            className="mt-1 h-9 w-[160px]"
          />
        </div>
        <Button
          size="sm"
          onClick={() => apply(localFrom, localTo)}
          disabled={localFrom > localTo}
        >
          Apply
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              variant="outline"
              size="sm"
              onClick={() => preset(p.days)}
            >
              {p.label}
            </Button>
          ))}
          <a href={csvHref()} download>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-4 w-4" /> CSV
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
