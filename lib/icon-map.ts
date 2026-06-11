import {
  BadgeCheck,
  Shield,
  Clock,
  Wallet,
  CalendarCheck,
  PhoneCall,
  Truck,
  Home,
  MessageSquare,
  Building,
  Building2,
  ListChecks,
  Star,
  MapPin,
  Box,
  Package,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Maps the `icon` text column stored in home_features / about_values to
// the actual Lucide React component. Add new entries here whenever the
// admin adds content referencing a different icon name. Unmapped names
// resolve to null so callers can render a sensible fallback.
export const ICON_MAP: Record<string, LucideIcon> = {
  'badge-check': BadgeCheck,
  shield: Shield,
  clock: Clock,
  wallet: Wallet,
  'calendar-check': CalendarCheck,
  'phone-call': PhoneCall,
  truck: Truck,
  home: Home,
  'message-square': MessageSquare,
  building: Building,
  'building-2': Building2,
  'list-checks': ListChecks,
  star: Star,
  'map-pin': MapPin,
  box: Box,
  package: Package,
};

export function getIcon(name: string | null | undefined): LucideIcon | null {
  if (!name) return null;
  return ICON_MAP[name] ?? null;
}
