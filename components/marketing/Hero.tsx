import Link from 'next/link';
import { ArrowRight, MessageCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BUSINESS, PRIMARY_CITY } from '@/lib/constants';
import { whatsappUrl } from '@/lib/utils';
import Image from 'next/image';
import * as React from 'react';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
      <div className="container py-12 sm:py-20 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white border px-3 py-1 text-xs font-medium text-brand-700 shadow-sm">
              <Shield className="h-3.5 w-3.5 text-brand-600" />
              Now serving all of {PRIMARY_CITY}
            </div>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Trusted Packers and Movers in {PRIMARY_CITY}
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              {BUSINESS.tagline}. Insured, on-time relocations with transparent pricing —
              book your slot online in under a minute.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href="/book">
                  Book Now <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="whatsapp" className="gap-2">
                <a href={whatsappUrl('Hi! I want a quote for moving.')} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Us
                </a>
              </Button>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-brand-600" /> Insured moves</span>
              <span>•</span>
              <span>On-time guarantee</span>
              <span>•</span>
              <span>No hidden charges</span>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-brand-100 via-brand-50 to-white shadow-inner">
              <Image src="/heroillustration.svg" alt="Hero Illustration" width={600} height={100} priority />
              <div className="absolute inset-8 flex flex-col justify-end gap-4 rounded-2xl bg-transparent p-6 shadow-lg ring-1 ring-brand-100">
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm font-semibold text-brand-700">Today&apos;s bookings</span>
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
                {[
                  { name: 'Home Shifting', area: 'Koramangala → Whitefield', time: '10:00 AM' },
                  { name: 'Office Shifting', area: 'Indiranagar → HSR Layout', time: '12:00 PM' },
                  { name: '2 BHK Shifting', area: 'Jayanagar → Marathahalli', time: '3:00 PM' },
                ].map((row) => (
                  <div key={row.name} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.area}</p>
                    </div>
                    <span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
                      {row.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
