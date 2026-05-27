import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateReferenceCode(): string {
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += REFERENCE_ALPHABET.charAt(
      Math.floor(Math.random() * REFERENCE_ALPHABET.length),
    );
  }
  return `PGM-${suffix}`;
}

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(paise: number | null | undefined): string {
  if (paise == null) return 'Custom quote';
  const rupees = paise / 100;
  return INR_FORMATTER.format(rupees);
}

export function formatTimeLabel(time: string): string {
  // Accepts 'HH:MM' or 'HH:MM:SS' — returns '9:00 AM'
  const [hStr, mStr] = time.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || '919876543210'}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function telUrl(): string {
  const phone = (process.env.NEXT_PUBLIC_BUSINESS_PHONE || '+919876543210').replace(/\s/g, '');
  return `tel:${phone}`;
}
