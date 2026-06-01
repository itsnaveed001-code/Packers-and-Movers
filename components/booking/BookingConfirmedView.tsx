'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Phone, MessageCircle, Copy, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { formatTimeLabel, telUrl, whatsappUrl } from '@/lib/utils';
import { STATUS_LABELS, BUSINESS } from '@/lib/constants';

type LookupBody = {
  reference_code: string;
  booking_date: string;
  booking_time: string;
  status: keyof typeof STATUS_LABELS;
  customer_first_name: string;
  pickup_city: string;
  dropoff_city: string;
  service: { name: string; slug: string } | null;
};

export function BookingConfirmedView() {
  const params = useSearchParams();
  const ref = params.get('ref');
  const { show } = useToast();

  const [state, setState] = React.useState<
    { kind: 'loading' } | { kind: 'ok'; data: LookupBody } | { kind: 'error' }
  >({ kind: 'loading' });

  React.useEffect(() => {
    if (!ref) {
      setState({ kind: 'error' });
      return;
    }
    fetch(`/api/bookings/lookup?ref=${encodeURIComponent(ref)}`)
      .then(async (res) => {
        if (!res.ok) {
          setState({ kind: 'error' });
          return;
        }
        const data = (await res.json()) as LookupBody;
        setState({ kind: 'ok', data });
      })
      .catch(() => setState({ kind: 'error' }));
  }, [ref]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      show({ variant: 'success', title: 'Copied reference code' });
    } catch {
      show({ variant: 'error', title: "Couldn't copy — please write it down" });
    }
  }

  async function downloadReceipt() {
    if (!ref) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const left = 48;
      let y = 64;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(14, 26, 61); // brand navy #0E1A3D
      doc.text(BUSINESS.name, left, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      y += 20;
      doc.text('Booking receipt', left, y);

      y += 16;
      doc.setDrawColor(226, 232, 240);
      doc.line(left, y, 547, y);

      y += 34;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(14, 26, 61);
      doc.text(`Reference: ${ref}`, left, y);

      const d = state.kind === 'ok' ? state.data : null;
      const rows: [string, string][] = [
        ['Service', d?.service?.name ?? '—'],
        [
          'Date',
          d
            ? new Date(d.booking_date).toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : '—',
        ],
        ['Time', d ? formatTimeLabel(d.booking_time) : '—'],
        ['Route', d ? `${d.pickup_city} to ${d.dropoff_city}` : '—'],
        ['Status', d ? STATUS_LABELS[d.status] : 'Pending'],
      ];

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      rows.forEach(([k, v]) => {
        y += 26;
        doc.setTextColor(100, 116, 139);
        doc.text(k, left, y);
        doc.setTextColor(15, 23, 42);
        doc.text(v, left + 130, y);
      });

      y += 44;
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('No payment was taken online — pay on the day of service.', left, y);
      y += 16;
      doc.text(`Questions? Call ${BUSINESS.phone} or message us on WhatsApp.`, left, y);

      doc.save(`${BUSINESS.name}-Booking-${ref}.pdf`);
      show({ variant: 'success', title: 'Receipt downloaded' });
    } catch {
      show({ variant: 'error', title: 'Could not generate the receipt' });
    }
  }

  if (!ref) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-muted-foreground">No reference code in the URL.</p>
        <Button asChild className="mt-4">
          <Link href="/book">Book a move</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Booking received!</h1>
        <p className="mt-2 text-muted-foreground">
          Save your reference code — we'll ask for it when we call.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 p-5 text-center">
            <p className="text-xs uppercase tracking-wide text-brand-700">
              Your reference code
            </p>
            <p className="mt-1 font-mono text-3xl font-bold text-brand-700 sm:text-4xl">
              {ref}
            </p>
            <button
              onClick={() => copy(ref)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy code
            </button>
          </div>

          <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
            <strong>What happens next:</strong> Our team will call you within 2 hours to
            confirm your booking and walk through the details.
          </div>

          <Button onClick={downloadReceipt} variant="outline" className="w-full gap-2">
            <Download className="h-4 w-4" /> Download receipt (PDF)
          </Button>

          {state.kind === 'loading' && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}

          {state.kind === 'error' && (
            <p className="text-sm text-muted-foreground">
              Couldn't load the booking summary — but your reference code above is what
              we'll need. Please keep it handy.
            </p>
          )}

          {state.kind === 'ok' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Summary label="Service" value={state.data.service?.name ?? '—'} />
              <Summary
                label="Date"
                value={new Date(state.data.booking_date).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              />
              <Summary label="Time" value={formatTimeLabel(state.data.booking_time)} />
              <Summary label="Status" value={STATUS_LABELS[state.data.status]} />
              <Summary
                label="Route"
                value={`${state.data.pickup_city} → ${state.data.dropoff_city}`}
                full
              />
            </div>
          )}

          <div className="flex flex-col gap-2 border-t pt-5 sm:flex-row">
            <Button asChild className="flex-1 gap-2" variant="default">
              <a href={telUrl()}>
                <Phone className="h-4 w-4" /> Call us
              </a>
            </Button>
            <Button asChild className="flex-1 gap-2" variant="whatsapp">
              <a
                href={whatsappUrl(`Hi! My booking ref is ${ref}. `)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp us
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Tip: take a screenshot of this page in case you need it later.
      </p>
    </div>
  );
}

function Summary({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
