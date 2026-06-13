'use client';

import * as React from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

// Bounds mirror lib/appSettings.ts so the server rejects anything the
// client could accept; the UI gives feedback before the round trip.
const DEPOSIT_MIN_INR = 0;
const DEPOSIT_MAX_INR = 5000;

export function DepositSettings({ initialInr }: { initialInr: number }) {
  const { show } = useToast();
  const [value, setValue] = React.useState<string>(String(initialInr));
  const [baseline, setBaseline] = React.useState<number>(initialInr);
  const [saving, setSaving] = React.useState(false);

  const parsed = Number.parseInt(value, 10);
  const valid =
    Number.isFinite(parsed) &&
    Number.isInteger(parsed) &&
    parsed >= DEPOSIT_MIN_INR &&
    parsed <= DEPOSIT_MAX_INR;
  const dirty = valid && parsed !== baseline;

  async function save() {
    if (!valid) {
      show({
        variant: 'error',
        title: 'Invalid amount',
        description: `Enter a whole number between ₹${DEPOSIT_MIN_INR} and ₹${DEPOSIT_MAX_INR}.`,
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/app-settings/deposit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deposit_inr: parsed }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        show({
          variant: 'error',
          title: "Couldn't save",
          description: body.error,
        });
        return;
      }
      const body = (await res.json()) as { deposit_inr: number };
      setBaseline(body.deposit_inr);
      setValue(String(body.deposit_inr));
      show({ variant: 'success', title: 'Deposit amount updated' });
    } catch {
      show({ variant: 'error', title: 'Network error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold">Payments</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Customer-facing deposit shown at booking time. Set to ₹0 to
            collect no deposit (the booking flow then skips Razorpay even
            if the keys are configured).
          </p>
        </div>
        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor="deposit_inr">Booking deposit (₹)</Label>
          <Input
            id="deposit_inr"
            type="number"
            inputMode="numeric"
            min={DEPOSIT_MIN_INR}
            max={DEPOSIT_MAX_INR}
            step={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!valid}
          />
          {!valid && value !== '' && (
            <p className="text-xs text-destructive">
              Must be a whole number between ₹{DEPOSIT_MIN_INR} and ₹{DEPOSIT_MAX_INR}.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Refundable on cancellation ≥12 hours before the booked slot.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <p className="text-xs text-muted-foreground">
            {dirty ? 'Unsaved changes.' : 'All changes saved.'}
          </p>
          <Button onClick={save} disabled={!dirty || saving} className="gap-1.5">
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
