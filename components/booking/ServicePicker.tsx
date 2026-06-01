'use client';

import { Truck, Home, Car, Package, Route, Building2, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Service } from '@/types/database';
import { cn, formatINR } from '@/lib/utils';
import { isComingSoon } from '@/lib/constants';

const ICONS: Record<string, LucideIcon> = {
  truck: Truck,
  home: Home,
  car: Car,
  package: Package,
  route: Route,
  'building-2': Building2,
};

export function ServicePicker({
  services,
  selectedId,
  onSelect,
}: {
  services: Service[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {services.map((service) => {
        const Icon = ICONS[service.icon_name] || Truck;
        const selected = service.id === selectedId;
        const soon = isComingSoon(service.slug);
        return (
          <button
            key={service.id}
            type="button"
            disabled={soon}
            onClick={() => {
              if (!soon) onSelect(service.id);
            }}
            className={cn(
              'group flex items-start gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition-all',
              !soon && 'hover:border-brand-300 hover:shadow-md',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              selected && 'border-brand-600 ring-2 ring-brand-500/30',
              soon && 'cursor-not-allowed opacity-60',
            )}
            aria-pressed={selected}
            aria-disabled={soon}
          >
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50',
                selected && 'bg-brand-100',
              )}
            >
              <Icon className="h-5 w-5 text-brand-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{service.name}</p>
                {soon && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    <Lock className="h-2.5 w-2.5" /> Soon
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                {service.short_description}
              </p>
              <p className="mt-1.5 text-xs font-medium text-brand-700">
                {soon
                  ? 'Coming soon'
                  : service.base_price != null
                    ? `From ${formatINR(service.base_price)}`
                    : 'Custom quote'}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
