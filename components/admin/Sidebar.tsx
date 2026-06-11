'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarOff,
  CalendarDays,
  Boxes,
  LogOut,
  Truck,
  Settings,
  BarChart3,
  Users,
  Inbox,
  BadgeIndianRupee,
  Building2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { BUSINESS } from '@/lib/constants';

const ITEMS: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: '/admin', label: 'Bookings', icon: LayoutDashboard, exact: true },
  { href: '/admin/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/inbox', label: 'Inbox', icon: Inbox },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/pricing', label: 'Pricing', icon: BadgeIndianRupee },
  { href: '/admin/services', label: 'Services', icon: Boxes },
  { href: '/admin/availability', label: 'Availability', icon: CalendarOff },
  { href: '/admin/business', label: 'Business', icon: Building2 },
  { href: '/admin/settings', label: 'Hours', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  }

  function isActive(item: (typeof ITEMS)[number]) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  return (
    <>
      {/* Desktop: fixed-height sticky sidebar. Only <main> scrolls, so the nav
          and the sign-out button (pinned to the bottom) never move. */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 border-r bg-white p-4 md:flex">
        <Link href="/" className="mb-3 flex items-center gap-2 px-2 text-brand-700">
          <Truck className="h-5 w-5" />
          <span className="font-semibold">{BUSINESS.name}</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Admin">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item)
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-foreground/80 hover:bg-secondary',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Button
          onClick={signOut}
          variant="ghost"
          className="mt-2 w-full justify-start gap-2 text-muted-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </aside>

      {/* Mobile: fixed bottom nav bar. Sign-out is a normal item at the end. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-1 overflow-x-auto border-t bg-white/95 px-1 py-1 backdrop-blur md:hidden"
        aria-label="Admin"
      >
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-[4.25rem] shrink-0 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors',
                isActive(item) ? 'bg-brand-50 text-brand-700' : 'text-foreground/70',
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={signOut}
          className="flex min-w-[4.25rem] shrink-0 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-muted-foreground"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </nav>
    </>
  );
}
