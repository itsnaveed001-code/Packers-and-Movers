import { CalendarCheck, PhoneCall, Truck } from 'lucide-react';

const STEPS = [
  {
    icon: CalendarCheck,
    title: 'Pick a slot',
    body: 'Choose your service, pick a date and a time that works for you.',
  },
  {
    icon: PhoneCall,
    title: 'We confirm by phone',
    body: 'Our team calls you within 2 hours to walk through the details and confirm the price.',
  },
  {
    icon: Truck,
    title: 'We move you',
    body: 'Our crew arrives on time, packs everything carefully, and gets you to your new place.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">
            Three simple steps. No payment required until the move is done.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="relative rounded-2xl border bg-white p-6">
              <span className="absolute -top-3 left-6 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                {i + 1}
              </span>
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                <Icon className="h-5 w-5 text-brand-600" />
              </div>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
