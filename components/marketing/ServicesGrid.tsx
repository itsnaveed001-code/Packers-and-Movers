import Link from 'next/link';
import { ArrowRight, Truck, Home, Car, Package, Route, Building2, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { Service } from '@/types/database';
import { cn } from '@/lib/utils';
import { isComingSoon, PRIMARY_CITY } from '@/lib/constants';
import type { LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  truck: Truck,
  home: Home,
  car: Car,
  package: Package,
  route: Route,
  'building-2': Building2,
};

function ServiceIcon({ name }: { name: string }) {
  const Icon = ICONS[name] || Truck;
  return <Icon className="h-6 w-6 text-brand-600" />;
}

export function ServicesGrid({
  services,
  className,
}: {
  services: Service[];
  className?: string;
}) {
  return (
    <section className={cn('py-16 sm:py-20', className)}>
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Services we offer
          </h2>
          <p className="mt-3 text-muted-foreground">
            From single-room moves to multi-city office relocations — we have you covered.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const soon = isComingSoon(service.slug);
            const card = (
              <Card
                className={cn(
                  'h-full p-6 transition-shadow',
                  soon ? 'opacity-75' : 'hover:shadow-md',
                )}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                    <ServiceIcon name={service.icon_name} />
                  </div>
                  {soon && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      <Lock className="h-3 w-3" /> Coming soon
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold">{service.name}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {service.short_description}
                </p>
                {soon ? (
                  <p className="mt-4 text-sm font-medium text-muted-foreground">
                    Launching in {PRIMARY_CITY} soon
                  </p>
                ) : (
                  <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 transition-all group-hover:gap-2">
                    Learn more <ArrowRight className="h-4 w-4" />
                  </p>
                )}
              </Card>
            );
            return soon ? (
              <div key={service.id} aria-disabled="true" className="cursor-not-allowed">
                {card}
              </div>
            ) : (
              <Link key={service.id} href={`/services/${service.slug}`} className="group">
                {card}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
