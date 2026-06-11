import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatINR } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type CustomerRow = {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  total_bookings: number;
  total_revenue: number;
  first_booking_at: string | null;
  last_booking_at: string | null;
  admin_notes: string | null;
  created_at: string;
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from('customers')
    .select(
      'id, phone, name, email, total_bookings, total_revenue, first_booking_at, last_booking_at, admin_notes, created_at',
    )
    .order('last_booking_at', { ascending: false, nullsFirst: false });

  if (q && q.trim().length > 0) {
    const term = q.trim();
    query = query.or(
      `name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`,
    );
  }

  const { data, error } = await query.limit(200);
  const customers = (data ?? []) as CustomerRow[];

  const totals = customers.reduce(
    (acc, c) => {
      acc.bookings += c.total_bookings;
      acc.revenue += c.total_revenue;
      return acc;
    },
    { bookings: 0, revenue: 0 },
  );

  return (
    <div className="container max-w-6xl py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Every customer who has booked, with their booking count and total
          revenue. The list updates automatically as bookings come in.
        </p>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Customers" value={String(customers.length)} />
        <Stat label="Total bookings" value={String(totals.bookings)} />
        <Stat label="Total revenue" value={formatINR(totals.revenue)} />
      </div>

      <form className="mb-4" action="/admin/customers" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by name, phone, or email"
          className="w-full max-w-md rounded-lg border bg-white px-3 py-2 text-sm shadow-sm"
        />
      </form>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Couldn&apos;t load customers — {error.message}.
        </p>
      ) : customers.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">
          No customers yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th className="hidden md:table-cell">Email</Th>
                <Th className="text-right">Bookings</Th>
                <Th className="text-right">Revenue</Th>
                <Th className="hidden lg:table-cell">Last booking</Th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-t transition-colors hover:bg-secondary/30"
                >
                  <Td>
                    <div className="font-medium">{c.name}</div>
                    {c.first_booking_at && (
                      <div className="text-xs text-muted-foreground">
                        Since {format(new Date(c.first_booking_at), 'MMM yyyy')}
                      </div>
                    )}
                  </Td>
                  <Td className="font-mono text-xs">
                    <Link
                      href={`tel:${c.phone.replace(/\s/g, '')}`}
                      className="text-brand-700 hover:underline"
                    >
                      {c.phone}
                    </Link>
                  </Td>
                  <Td className="hidden md:table-cell">
                    {c.email ? (
                      <Link
                        href={`mailto:${c.email}`}
                        className="text-brand-700 hover:underline"
                      >
                        {c.email}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Td>
                  <Td className="text-right tabular-nums">{c.total_bookings}</Td>
                  <Td className="text-right tabular-nums">
                    {c.total_revenue > 0 ? formatINR(c.total_revenue) : '—'}
                  </Td>
                  <Td className="hidden lg:table-cell text-xs text-muted-foreground">
                    {c.last_booking_at
                      ? formatDistanceToNow(new Date(c.last_booking_at), {
                          addSuffix: true,
                        })
                      : '—'}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Th({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}
