'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

type Blocked = { id: string; date: string; reason: string | null };

export function AvailabilityManager({
  initialBlocked,
}: {
  initialBlocked: Blocked[];
}) {
  const { show } = useToast();
  const [blocked, setBlocked] = React.useState<Blocked[]>(initialBlocked);
  const [date, setDate] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function addBlocked() {
    if (!date) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/blocked-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, reason }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        show({
          variant: 'error',
          title: "Couldn't block date",
          description: body.error,
        });
        return;
      }
      const body = (await res.json()) as { blocked: Blocked };
      setBlocked((prev) =>
        [...prev.filter((b) => b.id !== body.blocked.id), body.blocked].sort(
          (a, b) => a.date.localeCompare(b.date),
        ),
      );
      setDate('');
      setReason('');
      show({ variant: 'success', title: 'Date blocked' });
    } catch {
      show({ variant: 'error', title: 'Network error' });
    } finally {
      setBusy(false);
    }
  }

  async function removeBlocked(id: string) {
    const res = await fetch(
      `/api/admin/blocked-dates?id=${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      show({
        variant: 'error',
        title: "Couldn't unblock",
        description: body.error,
      });
      return;
    }
    setBlocked((prev) => prev.filter((b) => b.id !== id));
    show({ variant: 'success', title: 'Unblocked' });
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="text-sm font-semibold">Block a date</h2>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5"
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div>
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1.5"
              placeholder="e.g. Diwali holiday"
            />
          </div>
          <Button onClick={addBlocked} disabled={!date || busy} className="w-full gap-1">
            <Plus className="h-4 w-4" /> Block date
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {blocked.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No blocked dates. Customers can book any working day.
            </p>
          ) : (
            <ul className="divide-y">
              {blocked.map((b) => (
                <li key={b.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">
                      {format(new Date(b.date), 'EEEE, d MMM yyyy')}
                    </p>
                    {b.reason && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{b.reason}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBlocked(b.id)}
                    aria-label={`Unblock ${b.date}`}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
