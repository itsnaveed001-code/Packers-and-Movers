import { format } from 'date-fns';
import {
  Plus,
  CheckCircle2,
  CircleDashed,
  Calendar,
  Truck,
  XCircle,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import type { BookingEvent, BookingEventType } from '@/types/database';
import { formatINR, formatTimeLabel } from '@/lib/utils';

const ICONS: Record<BookingEventType, React.ComponentType<{ className?: string }>> = {
  created: Plus,
  confirmed: CheckCircle2,
  rescheduled: Calendar,
  in_progress: Truck,
  completed: CheckCircle2,
  cancelled: XCircle,
  payment_received: CreditCard,
  note_added: MessageSquare,
};

const COLORS: Record<BookingEventType, string> = {
  created: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-indigo-100 text-indigo-700',
  rescheduled: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-violet-100 text-violet-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
  payment_received: 'bg-emerald-100 text-emerald-700',
  note_added: 'bg-slate-100 text-slate-700',
};

const LABELS: Record<BookingEventType, string> = {
  created: 'Booking created',
  confirmed: 'Confirmed',
  rescheduled: 'Rescheduled',
  in_progress: 'Move in progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  payment_received: 'Payment received',
  note_added: 'Note added',
};

function summarize(e: BookingEvent): string | null {
  const payload = e.payload ?? {};
  switch (e.event_type) {
    case 'created': {
      const date = payload.booking_date as string | undefined;
      const time = payload.booking_time as string | undefined;
      if (date && time) return `Scheduled for ${date} at ${formatTimeLabel(time)}`;
      return null;
    }
    case 'rescheduled': {
      const fromDate = payload.from_date as string | undefined;
      const fromTime = payload.from_time as string | undefined;
      const toDate = payload.to_date as string | undefined;
      const toTime = payload.to_time as string | undefined;
      if (fromDate && toDate)
        return `${fromDate} ${fromTime ? formatTimeLabel(fromTime) : ''} → ${toDate} ${toTime ? formatTimeLabel(toTime) : ''}`;
      return null;
    }
    case 'payment_received': {
      const amount = payload.amount as number | undefined;
      const method = payload.method as string | undefined;
      const parts: string[] = [];
      if (amount != null) parts.push(formatINR(amount));
      if (method) parts.push(method.replace(/_/g, ' '));
      return parts.join(' · ') || null;
    }
    default:
      return null;
  }
}

export function BookingTimeline({ events }: { events: BookingEvent[] }) {
  if (events.length === 0) {
    return (
      <section className="mt-4 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Timeline
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          No events yet. Once you change status, reschedule, or record a payment,
          it&apos;ll show here.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Timeline
      </h2>
      <ol className="mt-4 space-y-4">
        {events.map((e, i) => {
          const Icon = ICONS[e.event_type] ?? CircleDashed;
          const detail = summarize(e);
          const isLast = i === events.length - 1;
          return (
            <li key={e.id} className="relative flex gap-3">
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[15px] top-9 h-[calc(100%+1rem)] w-px bg-border"
                />
              )}
              <span
                className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${COLORS[e.event_type] ?? 'bg-slate-100 text-slate-700'}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 pb-1">
                <p className="text-sm font-medium">
                  {LABELS[e.event_type] ?? e.event_type}
                </p>
                {detail && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
                )}
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {format(new Date(e.created_at), "d MMM yyyy 'at' p")}
                  {e.actor && e.actor !== 'system' && (
                    <span> · by {e.actor}</span>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
