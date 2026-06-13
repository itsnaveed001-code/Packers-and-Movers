'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
  Banknote,
  Copy,
  ExternalLink,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import type { Invoice, InvoiceLineItem } from '@/types/database';

const INVOICE_STATUS_STYLES: Record<
  Invoice['status'],
  { label: string; className: string }
> = {
  draft: { label: 'Draft', className: 'bg-secondary text-foreground/80' },
  sent: { label: 'Sent — awaiting payment', className: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Paid online', className: 'bg-emerald-100 text-emerald-800' },
  cash_received: { label: 'Cash received', className: 'bg-blue-100 text-blue-800' },
};

type DraftLine = { description: string; amount: string };

const EMPTY_LINE: DraftLine = { description: '', amount: '' };

function parseLine(line: DraftLine): InvoiceLineItem | null {
  const description = line.description.trim();
  const amount = Number.parseInt(line.amount, 10);
  if (!description) return null;
  if (!Number.isFinite(amount) || amount < 0) return null;
  return { description, amount_inr: amount };
}

function totalPaiseFromDrafts(lines: DraftLine[]): number {
  return lines.reduce((sum, line) => {
    const parsed = parseLine(line);
    return parsed ? sum + parsed.amount_inr * 100 : sum;
  }, 0);
}

function paiseToInr(paise: number): string {
  return Math.round(paise / 100).toLocaleString('en-IN');
}

export function AdminInvoiceSection({
  bookingId,
  invoice,
  payUrl,
}: {
  bookingId: string;
  invoice: Invoice | null;
  payUrl: string | null;
}) {
  if (invoice) {
    return (
      <SentInvoiceCard bookingId={bookingId} invoice={invoice} payUrl={payUrl} />
    );
  }
  return <NewInvoiceForm bookingId={bookingId} />;
}

// ---- New invoice form ------------------------------------------------

function NewInvoiceForm({ bookingId }: { bookingId: string }) {
  const { show } = useToast();
  const [lines, setLines] = React.useState<DraftLine[]>([{ ...EMPTY_LINE }]);
  const [notes, setNotes] = React.useState('');
  const [sending, setSending] = React.useState(false);

  const validLines = lines.map(parseLine).filter((x): x is InvoiceLineItem => x !== null);
  const totalPaise = totalPaiseFromDrafts(lines);
  const canSend = validLines.length > 0 && totalPaise >= 0;

  function updateLine(idx: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((line, i) => (i === idx ? { ...line, ...patch } : line)));
  }
  function addLine() {
    setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  }
  function removeLine(idx: number) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  async function send() {
    if (!canSend) {
      show({
        variant: 'error',
        title: 'Add at least one line item',
        description: 'Each row needs a description and a whole-rupee amount.',
      });
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_items: validLines,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        show({
          variant: 'error',
          title: "Couldn't send invoice",
          description: body.error,
        });
        return;
      }
      show({ variant: 'success', title: 'Invoice sent', description: 'The customer just got it by email.' });
      // Refresh the page so the sent view replaces this form.
      window.location.reload();
    } catch {
      show({ variant: 'error', title: 'Network error' });
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h2 className="text-base font-semibold">Invoice</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Build the bill, then send. The customer gets an email with a
            secure payment link.
          </p>
        </div>

        <div className="space-y-2">
          {lines.map((line, idx) => {
            const parsed = parseLine(line);
            return (
              <div
                key={idx}
                className="grid grid-cols-[1fr_140px_36px] items-end gap-2 sm:grid-cols-[1fr_180px_36px]"
              >
                <div>
                  {idx === 0 && (
                    <Label htmlFor={`desc_${idx}`} className="text-xs">
                      Description
                    </Label>
                  )}
                  <Input
                    id={`desc_${idx}`}
                    value={line.description}
                    onChange={(e) => updateLine(idx, { description: e.target.value })}
                    placeholder="e.g. 14ft truck — Bangalore → Bangalore"
                    className="mt-1"
                  />
                </div>
                <div>
                  {idx === 0 && (
                    <Label htmlFor={`amt_${idx}`} className="text-xs">
                      Amount (₹)
                    </Label>
                  )}
                  <Input
                    id={`amt_${idx}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={line.amount}
                    onChange={(e) => updateLine(idx, { amount: e.target.value })}
                    aria-invalid={line.amount !== '' && !parsed}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  disabled={lines.length === 1}
                  aria-label="Remove line"
                  className="mb-px flex h-10 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addLine}
            className="mt-1 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add line
          </Button>
        </div>

        <div>
          <Label htmlFor="invoice_notes">Notes (optional)</Label>
          <Textarea
            id="invoice_notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any extra context the customer should see on the invoice…"
            className="mt-1.5"
          />
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-brand-700">₹{paiseToInr(totalPaise)}</p>
          </div>
          <Button onClick={send} disabled={!canSend || sending} className="gap-2">
            <Send className="h-4 w-4" />
            {sending ? 'Sending…' : 'Send invoice'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Sent / paid invoice view ----------------------------------------

function SentInvoiceCard({
  bookingId,
  invoice,
  payUrl,
}: {
  bookingId: string;
  invoice: Invoice;
  payUrl: string | null;
}) {
  const { show } = useToast();
  const [resending, setResending] = React.useState(false);
  const [markingCash, setMarkingCash] = React.useState(false);

  const badge = INVOICE_STATUS_STYLES[invoice.status];
  const settled = invoice.status === 'paid' || invoice.status === 'cash_received';

  async function resend() {
    setResending(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/invoice/resend`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        show({ variant: 'error', title: "Couldn't resend", description: body.error });
        return;
      }
      show({ variant: 'success', title: 'Email sent again' });
    } catch {
      show({ variant: 'error', title: 'Network error' });
    } finally {
      setResending(false);
    }
  }

  async function markCashReceived() {
    setMarkingCash(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/invoice/cash-received`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        show({
          variant: 'error',
          title: "Couldn't mark cash received",
          description: body.error,
        });
        return;
      }
      show({ variant: 'success', title: 'Marked as cash received' });
      window.location.reload();
    } catch {
      show({ variant: 'error', title: 'Network error' });
    } finally {
      setMarkingCash(false);
    }
  }

  async function copyPayUrl() {
    if (!payUrl) return;
    try {
      await navigator.clipboard.writeText(payUrl);
      show({ variant: 'success', title: 'Payment link copied' });
    } catch {
      show({ variant: 'error', title: "Couldn't copy" });
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Invoice</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Sent on {format(new Date(invoice.sent_at ?? invoice.created_at), 'd MMM yyyy, p')}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        <ul className="divide-y rounded-lg border">
          {invoice.line_items.map((item, idx) => (
            <li key={idx} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>{item.description}</span>
              <span className="font-medium">₹{item.amount_inr.toLocaleString('en-IN')}</span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 bg-secondary/40 px-3 py-2">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-lg font-bold text-brand-700">
              ₹{paiseToInr(invoice.amount_paise)}
            </span>
          </li>
        </ul>

        {invoice.notes && (
          <div className="rounded-lg bg-secondary/40 p-3 text-sm whitespace-pre-wrap">
            {invoice.notes}
          </div>
        )}

        {(invoice.status === 'paid' || invoice.status === 'cash_received') && (
          <div className="space-y-1 rounded-lg border bg-emerald-50/60 p-3 text-sm">
            {invoice.status === 'paid' && (
              <>
                {invoice.paid_at && (
                  <p>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Paid at
                    </span>{' '}
                    {format(new Date(invoice.paid_at), 'd MMM yyyy, p')}
                  </p>
                )}
                {invoice.razorpay_payment_id && (
                  <p className="break-all">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Payment id
                    </span>{' '}
                    <span className="font-mono text-xs">{invoice.razorpay_payment_id}</span>
                  </p>
                )}
              </>
            )}
            {invoice.status === 'cash_received' && invoice.received_at && (
              <p>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Received at
                </span>{' '}
                {format(new Date(invoice.received_at), 'd MMM yyyy, p')}
              </p>
            )}
          </div>
        )}

        {!settled && payUrl && (
          <div className="flex flex-wrap gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={resend}
              disabled={resending}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {resending ? 'Resending…' : 'Resend email'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={markCashReceived}
              disabled={markingCash}
              className="gap-1.5"
            >
              <Banknote className="h-3.5 w-3.5" />
              {markingCash ? 'Saving…' : 'Mark as cash received'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyPayUrl}
              className="gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </Button>
            <a
              href={payUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Preview
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
