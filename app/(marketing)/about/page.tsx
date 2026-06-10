import { BUSINESS, PRIMARY_CITY } from '@/lib/constants';
import { Shield, Wallet, Clock, BadgeCheck } from 'lucide-react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'About',
  description: `Learn about ${BUSINESS.name}, our mission, and the team behind your move in ${PRIMARY_CITY}.`,
  path: '/about',
});

const VALUES = [
  {
    icon: BadgeCheck,
    title: 'Careful handling',
    body: 'Trained, background-checked crew who pack and move your things like their own.',
  },
  {
    icon: Wallet,
    title: 'Honest pricing',
    body: 'A clear estimate up front. No hidden charges added on the day of the move.',
  },
  {
    icon: Clock,
    title: 'On time',
    body: 'We show up in the slot you book — and keep you posted if anything changes.',
  },
  {
    icon: Shield,
    title: 'Insured moves',
    body: 'Transit cover available on every booking, so your move is protected.',
  },
];

export default function AboutPage() {
  return (
    <div className="bg-white">
      <section className="border-b bg-gradient-to-b from-brand-50 to-white">
        <div className="container py-14 sm:py-16">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            About {BUSINESS.name}
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            {BUSINESS.name} is a packers and movers service based in {PRIMARY_CITY},
            helping families and businesses relocate with less stress. We focus on
            careful handling, honest pricing, and showing up when we say we will.
          </p>
        </div>
      </section>

      <section className="container grid gap-10 py-14 sm:py-16 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold">Our story</h2>
          <p className="mt-3 text-muted-foreground">
            We started {BUSINESS.name} with a simple belief: moving shouldn&apos;t be
            chaotic. We&apos;re building a moving service that {PRIMARY_CITY} can rely
            on — one careful, on-time move at a time.
          </p>
          <p className="mt-3 text-muted-foreground">
            Every move is handled by a trained, background-checked crew and tracked
            from start to finish. No surprises, no hidden charges.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                <Icon className="h-5 w-5 text-brand-600" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
