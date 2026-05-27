import { Shield, BadgeCheck, Clock, Wallet } from 'lucide-react';

const PILLARS = [
  {
    icon: BadgeCheck,
    title: 'Verified team',
    body: 'Trained crew, background-checked, identified with company IDs on site.',
  },
  {
    icon: Shield,
    title: 'Insured moves',
    body: 'Transit insurance available on every booking. We cover what we move.',
  },
  {
    icon: Clock,
    title: 'On-time delivery',
    body: 'We commit to the slot you book. If we run late, we tell you up front.',
  },
  {
    icon: Wallet,
    title: 'Transparent pricing',
    body: 'Detailed estimate up front. No surprise charges on delivery day.',
  },
];

export function WhyChooseUs() {
  return (
    <section className="bg-secondary/50 py-16 sm:py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Why customers choose us
          </h2>
          <p className="mt-3 text-muted-foreground">
            Four things we never compromise on.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                <Icon className="h-5 w-5 text-brand-600" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
