import type { Metadata } from 'next';
import { BadgeCheck, Shield, FileCheck } from 'lucide-react';
import { BUSINESS, STATS } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'About us',
  description: `Learn about ${BUSINESS.name} — our story, the team, and what makes our moves different.`,
};

export default function AboutPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-white py-16 sm:py-20">
        <div className="container max-w-3xl">
          <p className="text-sm font-medium text-brand-700">About us</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            Moving people, not just things
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            We started {BUSINESS.name} because we kept hearing the same stories — broken
            furniture, mystery surcharges, vans that never arrived. We wanted to build a
            moving company we'd recommend to our own family. So we did.
          </p>
          <p className="mt-4 text-muted-foreground">
            Today our crew has completed thousands of moves across India. We're proud of the
            ones that went perfectly — and we own the ones that didn't, every time.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="container">
          {/* Placeholder stats — replace with real figures once available. */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Years in business', value: `${STATS.yearsExperience}+` },
              { label: 'Moves completed', value: STATS.movesCompleted },
              { label: 'Cities served', value: STATS.citiesServed },
              { label: 'Average rating', value: STATS.rating },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border bg-white p-6 text-center shadow-sm">
                <div className="text-3xl font-bold text-brand-700">{s.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-secondary/50 py-16 sm:py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Trust indicators</h2>
            <p className="mt-3 text-muted-foreground">
              We back every move with the paperwork to prove it.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { icon: Shield, title: 'Transit insurance', body: 'Optional cover on every move.' },
              { icon: BadgeCheck, title: 'Verified crew', body: 'Background-checked, uniformed, ID-bearing.' },
              { icon: FileCheck, title: 'GST registered', body: `GSTIN ${BUSINESS.gst}` },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl bg-white p-6 shadow-sm">
                <Icon className="h-6 w-6 text-brand-600" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
