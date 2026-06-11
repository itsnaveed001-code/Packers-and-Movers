'use client';

import * as React from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import type { PricingTier, Service } from '@/types/database';

type DraftTier = {
  // local-only key for React identity. Real ID comes from server on next load.
  key: string;
  label: string;
  sublabel: string;
  priceRupees: string; // free text so user can type
};

function tierToDraft(t: PricingTier): DraftTier {
  return {
    key: t.id,
    label: t.label,
    sublabel: t.sublabel ?? '',
    priceRupees: String(Math.round(t.price / 100)),
  };
}

function newDraftKey(): string {
  return `d_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function PricingManager({
  services,
  tiersByService,
}: {
  services: Service[];
  tiersByService: Record<string, PricingTier[]>;
}) {
  return (
    <div className="space-y-4">
      {services.map((svc) => (
        <ServiceCard
          key={svc.id}
          service={svc}
          initialTiers={tiersByService[svc.id] ?? []}
        />
      ))}
    </div>
  );
}

function ServiceCard({
  service,
  initialTiers,
}: {
  service: Service;
  initialTiers: PricingTier[];
}) {
  const { show } = useToast();
  const [open, setOpen] = React.useState(initialTiers.length > 0);
  const [comingSoon, setComingSoon] = React.useState(service.coming_soon);
  const [comingSoonSaving, setComingSoonSaving] = React.useState(false);
  const [drafts, setDrafts] = React.useState<DraftTier[]>(
    initialTiers.map(tierToDraft),
  );
  const [savedSnapshot, setSavedSnapshot] = React.useState<string>(
    JSON.stringify(initialTiers.map(tierToDraft)),
  );
  const [savingTiers, setSavingTiers] = React.useState(false);

  const dirty = JSON.stringify(drafts) !== savedSnapshot;

  function addTier() {
    setDrafts((arr) => [
      ...arr,
      { key: newDraftKey(), label: '', sublabel: '', priceRupees: '' },
    ]);
  }

  function removeTier(key: string) {
    setDrafts((arr) => arr.filter((d) => d.key !== key));
  }

  function updateTier(key: string, field: keyof DraftTier, value: string) {
    setDrafts((arr) =>
      arr.map((d) => (d.key === key ? { ...d, [field]: value } : d)),
    );
  }

  async function toggleComingSoon(next: boolean) {
    setComingSoonSaving(true);
    setComingSoon(next);
    try {
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coming_soon: next }),
      });
      if (!res.ok) throw new Error('failed');
      show({
        variant: 'success',
        title: next ? 'Marked coming soon' : 'Marked available',
      });
    } catch {
      setComingSoon(!next); // revert UI
      show({
        variant: 'error',
        title: "Couldn't update",
        description: 'Please try again.',
      });
    } finally {
      setComingSoonSaving(false);
    }
  }

  async function saveTiers() {
    // Build payload from drafts.
    const tiers: {
      label: string;
      sublabel: string | null;
      price: number;
      display_order: number;
    }[] = [];
    for (const [i, d] of drafts.entries()) {
      const label = d.label.trim();
      const rupees = Number.parseFloat(d.priceRupees);
      if (!label) {
        show({
          variant: 'error',
          title: 'Missing label',
          description: 'Every tier needs a label.',
        });
        return;
      }
      if (!Number.isFinite(rupees) || rupees < 0) {
        show({
          variant: 'error',
          title: 'Invalid price',
          description: `Check the price on "${label}".`,
        });
        return;
      }
      tiers.push({
        label,
        sublabel: d.sublabel.trim() || null,
        price: Math.round(rupees * 100),
        display_order: i * 10,
      });
    }

    setSavingTiers(true);
    try {
      const res = await fetch(`/api/admin/services/${service.id}/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiers }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        show({
          variant: 'error',
          title: "Couldn't save",
          description: err.error ?? 'Please try again.',
        });
        return;
      }
      setSavedSnapshot(JSON.stringify(drafts));
      show({ variant: 'success', title: 'Tiers saved' });
    } catch {
      show({
        variant: 'error',
        title: "Couldn't save",
        description: 'Network error. Please try again.',
      });
    } finally {
      setSavingTiers(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <header
        className={cn(
          'flex flex-wrap items-center gap-3 border-b p-4',
          comingSoon && 'bg-amber-50/40',
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              !open && '-rotate-90',
            )}
          />
          <div>
            <h2 className="text-base font-semibold">{service.name}</h2>
            <p className="text-xs text-muted-foreground">
              {drafts.length} tier{drafts.length === 1 ? '' : 's'}
              {comingSoon && ' · coming soon'}
            </p>
          </div>
        </button>

        <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-xs font-medium">
          <input
            type="checkbox"
            checked={comingSoon}
            onChange={(e) => toggleComingSoon(e.target.checked)}
            disabled={comingSoonSaving}
            className="h-4 w-4 rounded border-input accent-amber-600"
          />
          Coming soon
        </label>
      </header>

      {open && (
        <div className="space-y-3 p-4">
          {drafts.length === 0 ? (
            <p className="rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
              No tiers yet. The service page will show &ldquo;from ₹
              {service.base_price != null
                ? Math.round(service.base_price / 100).toLocaleString('en-IN')
                : '—'}
              &rdquo; based on the service base price.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-1/3 px-3 py-2">Label</th>
                    <th className="px-3 py-2">Sublabel</th>
                    <th className="w-32 px-3 py-2">Price (₹)</th>
                    <th className="w-12 px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((d) => (
                    <tr key={d.key} className="border-t align-top">
                      <td className="p-2">
                        <Input
                          value={d.label}
                          onChange={(e) =>
                            updateTier(d.key, 'label', e.target.value)
                          }
                          placeholder="e.g. 2 BHK"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={d.sublabel}
                          onChange={(e) =>
                            updateTier(d.key, 'sublabel', e.target.value)
                          }
                          placeholder="e.g. Most common family move"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          step="100"
                          value={d.priceRupees}
                          onChange={(e) =>
                            updateTier(d.key, 'priceRupees', e.target.value)
                          }
                          inputMode="numeric"
                        />
                      </td>
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTier(d.key)}
                          className="text-rose-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTier}
            >
              <Plus className="h-4 w-4" /> Add tier
            </Button>
            <Button
              type="button"
              onClick={saveTiers}
              disabled={!dirty || savingTiers}
              size="sm"
            >
              {savingTiers ? 'Saving…' : dirty ? 'Save tiers' : 'Up to date'}
            </Button>
          </div>

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Need to rename the service or change its long description?</summary>
            <p className="mt-1">
              Go to <Label className="font-mono">/admin/services</Label> for the
              full service editor. Pricing tiers and the coming-soon switch live
              here.
            </p>
          </details>
        </div>
      )}
    </article>
  );
}
