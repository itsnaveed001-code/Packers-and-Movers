'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BUSINESS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function Header() {
  const [open, setOpen] = React.useState(false);
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" aria-label={BUSINESS.name}>
          <Image src="/LOGO01.svg" alt={BUSINESS.name} width={200} height={80} priority />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm font-medium text-foreground/80 hover:text-brand-700"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild size="sm">
            <Link href="/book">Book Now</Link>
          </Button>
        </div>

        <button
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-secondary"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          'md:hidden border-t bg-white',
          open ? 'block' : 'hidden',
        )}
      >
        <nav className="container flex flex-col gap-1 py-3" aria-label="Mobile">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-2 py-2 text-sm font-medium hover:bg-secondary"
              onClick={() => setOpen(false)}
            >
              {n.label}
            </Link>
          ))}
          <Button asChild className="mt-2">
            <Link href="/book" onClick={() => setOpen(false)}>
              Book Now
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
