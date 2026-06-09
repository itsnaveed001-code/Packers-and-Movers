import { formatINR } from '@/lib/utils';

type Week = {
  label: string;
  count: number;
  revenue: number;
  startISO: string;
};

export function WeeklyBarChart({ weeks }: { weeks: Week[] }) {
  if (weeks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Empty range.
      </p>
    );
  }
  const max = Math.max(1, ...weeks.map((w) => w.count));
  return (
    <div className="flex items-end gap-2 sm:gap-3 overflow-x-auto pb-1">
      {weeks.map((w) => {
        const heightPct = Math.round((w.count / max) * 100);
        return (
          <div
            key={w.startISO}
            className="flex min-w-[44px] flex-1 flex-col items-center"
            title={`${w.count} booking${w.count === 1 ? '' : 's'} · ${formatINR(w.revenue)}`}
          >
            <span className="mb-1 text-[10px] font-semibold text-muted-foreground">
              {w.count > 0 ? w.count : ''}
            </span>
            <div
              className="w-full rounded-t-md bg-brand-500/80 transition-all"
              style={{ height: `${Math.max(heightPct, w.count > 0 ? 4 : 0)}%`, minHeight: 1 }}
              aria-hidden
            />
            <span className="mt-1 text-[10px] text-muted-foreground">
              {w.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
