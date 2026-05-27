import { cn } from '@/lib/utils';
import { STATUS_LABELS, STATUS_COLORS, type BookingStatus } from '@/lib/constants';

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        STATUS_COLORS[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
