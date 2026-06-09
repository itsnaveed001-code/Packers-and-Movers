'use client';

import * as React from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import type { AvailabilitySettings } from '@/types/database';

const DAYS = [
  { value: 0, short: 'Sun', long: 'Sunday' },
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
];

function trimSeconds(t: string): string {
  // The DB stores 'HH:MM:SS' but <input type="time"> wants 'HH:MM'.
  return t.length >= 5 ? t.slice(0, 5) : t;
}

type Form = {
  working_days: number[];
  working_hours_start: string;
  working_hours_end: string;
  slot_duration_minutes: number;
  max_concurrent_bookings_per_slot: number;
  advance_booking_days: number;
  minimum_notice_hours: number;
};

function toForm(s: AvailabilitySettings): Form {
  return {
    working_days: [...s.working_days].sort((a, b) => a - b),
    working_hours_start: trimSeconds(s.working_hours_start),
    working_hours_end: trimSeconds(s.working_hours_end),
    slot_duration_minutes: s.slot_duration_minutes,
    max_concurrent_bookings_per_slot: s.max_concurrent_bookings_per_slot,
    advance_booking_days: s.advance_booking_days,
    minimum_notice_hours: s.minimum_notice_hours,
  };
}

function isDirty(a: Form, b: Form): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

export function SettingsManager({ initial }: { initial: AvailabilitySettings }) {
  const { show } = useToast();
  const baseline = React.useMemo(() => toForm(initial), [initial]);
  const [form, setForm] = React.useState<Form>(baseline);
  const [saving, setSaving] = React.useState(false);
  const dirty = isDirty(form, baseline);

  function toggleDay(d: number) {
    setForm((f) => {
      const has = f.working_days.includes(d);
      const next = has
        ? f.working_days.filter((x) => x !== d)
        : [...f.working_days, d].sort((a, b) => a - b);
      return { ...f, working_days: next };
    });
  }

  async function save() {
    if (form.working_days.length === 0) {
      show({ variant: 'error', title: 'Pick at least one working day' });
      return;
    }
    if (form.working_hours_start >= form.working_hours_end) {
      show({
        variant: 'error',
        title: 'Invalid hours',
        description: 'Start time must be before end time.',
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        show({
          variant: 'error',
          title: "Couldn't save",
          description: body.message || body.error,
        });
        return;
      }
      show({ variant: 'success', title: 'Settings saved' });
      // Refresh baseline so 'dirty' resets without reloading.
      const body = (await res.json()) as { settings: AvailabilitySettings };
      const fresh = toForm(body.settings);
      setForm(fresh);
    } catch {
      show({ variant: 'error', title: 'Network error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-5 p-5">
          <section>
            <Label>Working days</Label>
            <p className="mb-3 mt-1 text-xs text-muted-foreground">
              Customers can only book on these days.
            </p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const active = form.working_days.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    aria-pressed={active}
                    aria-label={d.long}
                    className={cn(
                      'h-10 min-w-[3.25rem] rounded-lg border px-3 text-sm font-medium transition-colors',
                      active
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-border bg-white text-foreground/70 hover:bg-secondary',
                    )}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="start">Working hours start</Label>
              <Input
                id="start"
                type="time"
                value={form.working_hours_start}
                onChange={(e) =>
                  setForm((f) => ({ ...f, working_hours_start: e.target.value }))
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="end">Working hours end</Label>
              <Input
                id="end"
                type="time"
                value={form.working_hours_end}
                onChange={(e) =>
                  setForm((f) => ({ ...f, working_hours_end: e.target.value }))
                }
                className="mt-1.5"
              />
            </div>
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-5">
          <h2 className="text-sm font-semibold">Slot rules</h2>
          <section className="grid gap-4 sm:grid-cols-2">
            <NumberField
              id="slot"
              label="Slot length (minutes)"
              value={form.slot_duration_minutes}
              min={15}
              max={480}
              step={15}
              onChange={(v) =>
                setForm((f) => ({ ...f, slot_duration_minutes: v }))
              }
              hint="How long each booking block is. 60 = hourly slots."
            />
            <NumberField
              id="cap"
              label="Max bookings per slot"
              value={form.max_concurrent_bookings_per_slot}
              min={1}
              max={20}
              step={1}
              onChange={(v) =>
                setForm((f) => ({ ...f, max_concurrent_bookings_per_slot: v }))
              }
              hint="How many crews you can run in parallel at the same time."
            />
            <NumberField
              id="advance"
              label="Allow booking up to (days ahead)"
              value={form.advance_booking_days}
              min={1}
              max={365}
              step={1}
              onChange={(v) =>
                setForm((f) => ({ ...f, advance_booking_days: v }))
              }
              hint="How far in the future customers can book."
            />
            <NumberField
              id="notice"
              label="Minimum notice (hours)"
              value={form.minimum_notice_hours}
              min={0}
              max={168}
              step={1}
              onChange={(v) =>
                setForm((f) => ({ ...f, minimum_notice_hours: v }))
              }
              hint="Earliest gap between booking time and now. 24 = next day."
            />
          </section>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <p className="text-xs text-muted-foreground">
          {dirty ? 'Unsaved changes.' : 'All changes saved.'}
        </p>
        <Button onClick={save} disabled={!dirty || saving} className="gap-1.5">
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="mt-1.5"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
