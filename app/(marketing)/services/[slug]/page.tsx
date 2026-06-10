import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CheckCircle2, Lock, MessageCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { getServiceBySlug } from '@/lib/queries';
import { formatINR, whatsappUrl } from '@/lib/utils';
import { isComingSoon, HOUSE_SHIFTING_TIERS, PRIMARY_CITY } from '@/lib/constants';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return { title: 'Service not found' };
  return pageMetadata({
    title: service.name,
    description: service.short_description,
    path: `/services/${slug}`,
  });
}

const INCLUDED_BY_SLUG: Record<string, string[]> = {
  'home-shifting': [
    'Careful packing of every room with quality materials',
    'Dismantling and reassembly of furniture',
    'Loading, transit and unloading',
    'Unpacking and setup at destination',
    'Transit insurance available',
  ],
  'office-shifting': [
    'Site survey and move plan in advance',
    'IT equipment handling',
    'Weekend or after-hours slots',
    'Structured unpacking at destination',
    'Workstation reassembly',
  ],
  'vehicle-transport': [
    'Bike or car pickup from your address',
    'Enclosed or open carrier options',
    'GPS tracking through transit',
    'Insured against transit damage',
    'Door-to-door delivery',
  ],
  'local-moves': [
    'Same-day slots available',
    'Right-sized vehicles (tempo or mini-truck)',
    'Packing materials included',
    'Helpers for loading/unloading',
  ],
  'intercity-moves': [
    'Dedicated truck — no co-loading',
    'Scheduled delivery window',
    'Full transit insurance',
    'Real-time updates en route',
  ],
  storage: [
    'Clean, climate-stable facility',
    'CCTV monitored, 24/7 security',
    'Short and long-term options',
    'Easy pickup and drop scheduling',
  ],
};

const FAQS_BY_SLUG: Record<string, { q: string; a: string }[]> = {
  'home-shifting': [
    {
      q: 'How long does a home move take?',
      a: 'A typical 2BHK takes 6–8 hours end-to-end for a local move. Larger homes and intercity moves take longer; we share a detailed estimate after a quick chat.',
    },
    {
      q: 'Do you provide packing materials?',
      a: 'Yes — boxes, bubble wrap, stretch film, and tape are included in every home move.',
    },
    {
      q: 'What about my fragile items?',
      a: "We use double-walled boxes, custom crating for art and glass, and dedicated padding. We'll walk you through it before move day.",
    },
    {
      q: 'Is insurance included?',
      a: 'Optional transit insurance is available on every move and we strongly recommend it for high-value contents.',
    },
  ],
  'office-shifting': [
    {
      q: 'Can you move us over the weekend?',
      a: 'Yes — weekend and after-hours slots are designed exactly for this. Most offices choose Friday evening to Sunday.',
    },
    {
      q: 'Do you handle IT equipment?',
      a: 'Yes. We disconnect, label, transport, and reconnect workstations and routers. Server racks require a quick survey first.',
    },
    {
      q: 'How do you minimise downtime?',
      a: 'We plan the move in zones so critical teams are operational first thing Monday.',
    },
  ],
  'vehicle-transport': [
    {
      q: 'Will my vehicle pick up additional kilometres?',
      a: 'No. Vehicles are loaded onto the carrier — the odometer does not move during transit.',
    },
    {
      q: 'How long does intercity transport take?',
      a: 'Bengaluru to a nearby city is typically 1–2 days. Longer routes vary — we share a delivery window before booking.',
    },
    {
      q: 'Is the vehicle insured during transit?',
      a: 'Yes — transit insurance is included by default for vehicle transport.',
    },
  ],
  'local-moves': [
    {
      q: 'Do you offer same-day moves?',
      a: 'Subject to availability — book by 11 AM and we can usually arrange a same-day slot for small moves.',
    },
    {
      q: 'What size vehicle do I need?',
      a: "We'll recommend the right size after a quick call. Small (tempo), medium (407), or large (mini-truck).",
    },
    {
      q: 'Can I help with loading?',
      a: 'Absolutely. But our crew is included — no extra cost.',
    },
  ],
  'intercity-moves': [
    {
      q: 'Do you co-load with other customers?',
      a: 'No — every intercity move is on a dedicated vehicle. Your goods are not mixed with anyone else’s.',
    },
    {
      q: 'What are the delivery windows?',
      a: 'Typical metro-to-metro moves take 1–3 days. We commit to a window before you book.',
    },
    {
      q: 'How is pricing calculated?',
      a: 'Pricing depends on volume, distance, and floor access. We share a fixed quote — no per-kilometre surprises.',
    },
  ],
  storage: [
    {
      q: 'How is the storage facility secured?',
      a: '24/7 CCTV, security guards, and access control. Climate is stable year-round.',
    },
    {
      q: 'How is storage priced?',
      a: 'By volume per month. We share a fixed monthly rate after the inventory is confirmed.',
    },
    {
      q: 'Can you pick items up and drop them off?',
      a: 'Yes — scheduled pickup and delivery on request, added to your monthly bill.',
    },
  ],
};

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const includes = INCLUDED_BY_SLUG[service.slug] ?? [];
  const faqs = FAQS_BY_SLUG[service.slug] ?? [];
  const soon = isComingSoon(service.slug);
  const tiers = service.slug === 'home-shifting' ? HOUSE_SHIFTING_TIERS : [];

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-white py-16 sm:py-20">
        <div className="container max-w-3xl">
          <p className="text-sm font-medium text-brand-700">Services</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            {service.name}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {service.description}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            {soon ? (
              <>
                <span className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-muted-foreground">
                  <Lock className="h-4 w-4" /> Coming soon to {PRIMARY_CITY}
                </span>
                <Button asChild size="lg" variant="whatsapp" className="gap-2">
                  <a
                    href={whatsappUrl(`Hi! Please notify me when ${service.name} is available.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-4 w-4" /> Notify me
                  </a>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg" className="gap-2">
                  <Link href={`/book?service=${service.slug}`}>
                    Book this service <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                {service.base_price != null && (
                  <p className="text-sm text-muted-foreground">
                    Starting from{' '}
                    <span className="font-semibold text-foreground">
                      {formatINR(service.base_price)}
                    </span>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {tiers.length > 0 && (
        <section className="py-12">
          <div className="container max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight">Indicative pricing</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Starting prices by home size. Final price depends on distance, floor,
              and the exact items — we confirm a fixed quote before you pay.
            </p>
            <div className="mt-5 overflow-hidden rounded-2xl border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Home size</th>
                    <th className="px-4 py-3 font-semibold">Starting from</th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((t) => (
                    <tr key={t.label} className="border-t">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.note}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-brand-700">
                        ₹{t.priceFrom.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              * Indicative starting prices. You&apos;ll get an exact quote on a quick call.
            </p>
          </div>
        </section>
      )}

      {includes.length > 0 && (
        <section className="py-12">
          <div className="container max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight">What&apos;s included</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {includes.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section className="bg-secondary/50 py-12">
          <div className="container max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight">Frequently asked</h2>
            <div className="mt-5 rounded-2xl border bg-white px-6">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((f, i) => (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger>{f.q}</AccordionTrigger>
                    <AccordionContent>{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      )}

      <section className="py-12">
        <div className="container max-w-3xl text-center">
          {soon ? (
            <>
              <h2 className="text-2xl font-bold tracking-tight">
                {service.name} is launching soon in {PRIMARY_CITY}
              </h2>
              <p className="mt-2 text-muted-foreground">
                Want it sooner? Message us and we&apos;ll prioritise your area.
              </p>
              <Button asChild size="lg" variant="whatsapp" className="mt-5 gap-2">
                <a
                  href={whatsappUrl(`Hi! Please notify me when ${service.name} is available.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" /> Notify me on WhatsApp
                </a>
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold tracking-tight">
                Ready to book your {service.name.toLowerCase()}?
              </h2>
              <p className="mt-2 text-muted-foreground">It takes less than a minute.</p>
              <Button asChild size="lg" className="mt-5 gap-2">
                <Link href={`/book?service=${service.slug}`}>
                  Book now <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </section>
    </>
  );
}
