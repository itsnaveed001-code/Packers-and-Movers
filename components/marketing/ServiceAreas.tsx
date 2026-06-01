import { MapPin } from 'lucide-react';
import { SERVICE_AREAS, PRIMARY_CITY } from '@/lib/constants';

export function ServiceAreas() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Areas we serve in {PRIMARY_CITY}
          </h2>
          <p className="mt-3 text-muted-foreground">
            Local home and office moves across {PRIMARY_CITY}. Don&apos;t see your area? Just ask.
          </p>
        </div>

        <ul className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SERVICE_AREAS.map((area) => (
            <li
              key={area}
              className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-medium shadow-sm"
            >
              <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
              {area}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
