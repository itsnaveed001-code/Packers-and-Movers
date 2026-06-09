'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarOff,
  Boxes,
  LogOut,
  Truck,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { BUSINESS } from '@/lib/constants';

const ITEMS = [
  { href: '/admin', label: 'Bookings', icon: LayoutDashboard, exact: true },
  { href: '/admin/availability', label: 'Availability', icon: CalendarOff },
  { href: '/admin/services', label: 'Services', icon: Boxes },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  }

  return (
    <aside className="flex w-full flex-col gap-1 border-b bg-white p-3 md:h-screen md:w-60 md:border-b-0 md:border-r md:p-4">
      <Link href="/" className="mb-3 hidden items-center gap-2 px-2 text-brand-700 md:flex">
        <Truck className="h-5 w-5" />
        <span className="font-semibold">{BUSINESS.name}</span>
      </Link>

      <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Admin">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
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

      <div className="mt-auto hidden md:block">
        <Button
          onClick={signOut}
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>

      <Button
        onClick={signOut}
        variant="ghost"
        size="sm"
        className="md:hidden ml-auto gap-2 text-muted-foreground"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </aside>
  );
}
