'use client';

import { Truck, Home, Car, Package, Route, Building2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Service } from '@/types/database';
import { cn, formatINR } from '@/lib/utils';

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
        return (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelect(service.id)}
            className={cn(
              'group flex items-start gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition-all',
              'hover:border-brand-300 hover:shadow-md',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              selected && 'border-brand-600 ring-2 ring-brand-500/30',
            )}
            aria-pressed={selected}
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
              <p className="font-semibold">{service.name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                {service.short_description}
              </p>
              <p className="mt-1.5 text-xs font-medium text-brand-700">
                {service.base_price != null
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
