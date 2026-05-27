'use client';

import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ChevronRight, Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './StatusBadge';
import { formatTimeLabel } from '@/lib/utils';
import { BOOKING_STATUSES, STATUS_LABELS, type BookingStatus } from '@/lib/constants';

type BookingRow = {
  id: string;
  reference_code: string;
  booking_date: string;
  booking_time: string;
  customer_name: string;
  customer_phone: string;
  status: BookingStatus;
  pickup_city: string;
  dropoff_city: string;
  service: { name: string; slug: string } | null;
};

export function BookingsTable({ initialFilter }: { initialFilter?: 'today' | 'upcoming' | 'all' }) {
  const [rows, setRows] = React.useState<BookingRow[] | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [search, setSearch] = React.useState('');
  const filter = initialFilter ?? 'all';

  React.useEffect(() => {
    let cancelled = false;
    setRows(null);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    const today = new Date().toISOString().slice(0, 10);
    if (filter === 'today') {
      params.set('from', today);
      params.set('to', today);
    } else if (filter === 'upcoming') {
      params.set('from', today);
    }
    fetch(`/api/bookings?${params.toString()}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          if (!cancelled) setRows([]);
          return;
        }
        const body = (await res.json()) as { bookings: BookingRow[] };
        if (!cancelled) setRows(body.bookings);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter, filter]);

  const filtered = React.useMemo(() => {
    if (!rows) return null;
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.reference_code, r.customer_name, r.customer_phone, r.pickup_city, r.dropoff_city]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by reference, name, phone, city…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {BOOKING_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Date · Time</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered === null && (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            )}
            {filtered?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No bookings match these filters.
                </TableCell>
              </TableRow>
            )}
            {filtered?.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs font-semibold">
                  <Link href={`/admin/bookings/${row.id}`} className="hover:underline">
                    {row.reference_code}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="text-sm">{format(new Date(row.booking_date), 'd MMM yyyy')}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimeLabel(row.booking_time)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{row.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{row.customer_phone}</div>
                </TableCell>
                <TableCell className="text-sm">{row.service?.name ?? '—'}</TableCell>
                <TableCell className="text-sm">
                  {row.pickup_city} → {row.dropoff_city}
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/bookings/${row.id}`}
                    aria-label="View booking"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
