import { MapPin } from 'lucide-react';
import { CITIES } from '@/lib/constants';

export function ServiceAreas() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Cities we serve
          </h2>
          <p className="mt-3 text-muted-foreground">
            Local moves within these cities and intercity moves between them.
          </p>
        </div>

        <ul className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {CITIES.map((city) => (
            <li
              key={city}
              className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-medium shadow-sm"
            >
              <MapPin className="h-4 w-4 text-brand-600" />
              {city}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
