import Link from 'next/link';
import { Truck, Phone, Mail, MapPin } from 'lucide-react';
import { BUSINESS, PRIMARY_CITY, SERVICE_AREAS } from '@/lib/constants';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-brand-900 text-brand-50">
      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 text-white">
              <Truck className="h-6 w-6" />
              <span className="text-lg font-semibold">{BUSINESS.name}</span>
            </Link>
            <p className="mt-3 text-sm text-brand-100/80">
              {BUSINESS.tagline}.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Services</h4>
            <ul className="space-y-1.5 text-sm text-brand-100/80">
              <li><Link href="/services/home-shifting" className="hover:text-white">Home shifting</Link></li>
              <li><Link href="/services/office-shifting" className="hover:text-white">Office shifting</Link></li>
              <li><Link href="/services/vehicle-transport" className="hover:text-white">Vehicle transport</Link></li>
              <li><Link href="/services/intercity-moves" className="hover:text-white">Intercity moves</Link></li>
              <li><Link href="/services/storage" className="hover:text-white">Storage</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Service Areas</h4>
            <p className="text-sm text-brand-100/80">
              Serving all of {PRIMARY_CITY} — including{' '}
              {SERVICE_AREAS.slice(0, 6).join(', ')}, and more.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Get in touch</h4>
            <ul className="space-y-2 text-sm text-brand-100/80">
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                <a href={`tel:${BUSINESS.phone.replace(/\s/g, '')}`} className="hover:text-white">
                  {BUSINESS.phone}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                <a href={`mailto:${BUSINESS.email}`} className="hover:text-white">
                  {BUSINESS.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{BUSINESS.address}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-brand-800 pt-6 text-xs text-brand-100/60 md:flex-row">
          <p>© {year} {BUSINESS.name}. All rights reserved.</p>
          <p className="flex gap-4">
            <Link href="/contact" className="hover:text-white">Contact</Link>
            <Link href="/about" className="hover:text-white">About</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
