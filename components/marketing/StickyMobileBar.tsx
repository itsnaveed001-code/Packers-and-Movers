import Link from 'next/link';
import { Phone, MessageCircle, Calendar } from 'lucide-react';
import { BUSINESS } from '@/lib/constants';

export function StickyMobileBar() {
  return (
    <div className="md:hidden sticky bottom-0 z-30 grid grid-cols-3 border-t bg-white">
      <a
        href={`tel:${BUSINESS.phone.replace(/\s/g, '')}`}
        className="flex items-center justify-center gap-2 border-r py-3 text-sm font-medium text-brand-700"
      >
        <Phone className="h-4 w-4" />
        Call
      </a>
      <a
        href={`https://wa.me/${BUSINESS.whatsapp}`}
        className="flex items-center justify-center gap-2 border-r py-3 text-sm font-medium text-emerald-700"
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </a>
      <Link
        href="/book"
        className="flex items-center justify-center gap-2 bg-brand-600 py-3 text-sm font-semibold text-white"
      >
        <Calendar className="h-4 w-4" />
        Book
      </Link>
    </div>
  );
}
