'use client';

import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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

export function SlotPicker({
  date,
  serviceId,
  selectedTime,
  onSelect,
}: {
  date: string | null; // YYYY-MM-DD
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
    return (
      <p className="rounded-xl border border-dashed bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
        Pick a date first.
      </p>
    );
  }

  if (state.kind === 'loading') {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
        Couldn't load slots. Please try again.
      </p>
    );
  }

  if (state.kind === 'empty') {
    const msg =
      state.reason === 'blocked'
        ? 'We are closed on this date. Please pick another.'
        : state.reason === 'non_working'
          ? 'No slots available on this day of the week.'
          : 'This date is in the past.';
    return (
      <p className="rounded-xl border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
        {msg}
      </p>
    );
  }

  if (state.slots.length === 0) {
    return (
      <p className="rounded-xl border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
        No slots configured for this date.
      </p>
    );
  }

  const anyAvailable = state.slots.some((s) => s.available);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {state.slots.map((slot) => {
          const isSelected = selectedTime === slot.time;
          const disabled = !slot.available;
          return (
            <button
              key={slot.time}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(slot.time)}
              className={cn(
                'flex h-12 flex-col items-center justify-center rounded-lg border bg-white text-sm font-medium transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                isSelected && 'border-brand-600 bg-brand-50 ring-2 ring-brand-500/30',
                !isSelected && !disabled && 'hover:border-brand-300',
                disabled && 'cursor-not-allowed bg-secondary/40 text-muted-foreground opacity-70',
              )}
              aria-pressed={isSelected}
            >
              <span className={cn(disabled && 'line-through')}>{slot.label}</span>
              {disabled && (
                <span className="text-[10px] font-normal uppercase tracking-wide">
                  {slot.tooSoon ? 'Too soon' : 'Booked'}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {!anyAvailable && (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          All slots are taken on this date. Try another day.
        </p>
      )}
    </div>
  );
}
