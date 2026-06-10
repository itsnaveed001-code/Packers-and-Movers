import { Phone, Mail, MessageCircle, MapPin, Clock } from 'lucide-react';
import { ContactForm } from '@/components/marketing/ContactForm';
import { BUSINESS, HOURS } from '@/lib/constants';
import { whatsappUrl } from '@/lib/utils';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Contact us',
  description: `Get in touch with ${BUSINESS.name}. Call, WhatsApp, or send us a message — we usually respond within a few hours.`,
  path: '/contact',
});

export default function ContactPage() {
  const mapsSrc = `https://www.google.com/maps?q=${encodeURIComponent(BUSINESS.address)}&output=embed`;

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-white py-16">
        <div className="container max-w-5xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Contact us</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            We're here to help with any question — large move or small. The fastest way is WhatsApp.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container grid max-w-5xl gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">Reach us directly</h2>
            <ul className="mt-4 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 text-brand-600" />
                <div>
                  <p className="font-medium">Phone</p>
                  <a href={`tel:${BUSINESS.phone.replace(/\s/g, '')}`} className="text-brand-700 hover:underline">
                    {BUSINESS.phone}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-medium">WhatsApp</p>
                  <a
                    href={whatsappUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:underline"
                  >
                    Chat with us
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-brand-600" />
                <div>
                  <p className="font-medium">Email</p>
                  <a href={`mailto:${BUSINESS.email}`} className="text-brand-700 hover:underline">
                    {BUSINESS.email}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-brand-600" />
                <div>
                  <p className="font-medium">Office</p>
                  <p className="text-muted-foreground">{BUSINESS.address}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-brand-600" />
                <div>
                  <p className="font-medium">Hours</p>
                  <p className="text-muted-foreground">Mon–Sat: {HOURS.weekday}</p>
                  <p className="text-muted-foreground">Sun: {HOURS.sunday}</p>
                </div>
              </li>
            </ul>

            <div className="mt-8 overflow-hidden rounded-2xl border">
              <iframe
                title="Office location"
                src={mapsSrc}
                width="100%"
                height="280"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Send us a message</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We usually reply within a few hours during business hours.
            </p>
            <div className="mt-5">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
