import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';
import { BUSINESS } from '@/lib/constants';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(BUSINESS.siteUrl),
  title: {
    default: `${BUSINESS.name} — Packers and Movers in Bengaluru`,
    template: `%s · ${BUSINESS.name}`,
  },
  description:
    'Professional packers and movers in Bengaluru offering home shifting, office relocation, and local moves. Insured, on-time, transparent pricing. Book online.',
  applicationName: BUSINESS.name,
  authors: [{ name: BUSINESS.name }],
  // NOTE: no `keywords` — the meta keywords tag is deprecated and ignored by
  // search engines. NOTE: no global `alternates.canonical` here on purpose —
  // each page sets its own canonical via lib/seo.ts `pageMetadata`, so pages
  // stop inheriting a single site-wide canonical. This block is only the
  // fallback OG for routes that don't set their own (e.g. /admin, which is
  // noindex anyway).
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: BUSINESS.name,
    title: `${BUSINESS.name} — Trusted Packers and Movers`,
    description:
      'Insured, on-time home and office relocations in Bengaluru. Book your slot online.',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BUSINESS.name} — Trusted Packers and Movers`,
    description:
      'Insured, on-time home and office relocations in Bengaluru. Book your slot online.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#0E1A3D',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
