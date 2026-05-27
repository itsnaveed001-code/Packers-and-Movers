import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Step = { id: number; label: string };

export function StepIndicator({
  steps,
  current,
}: {
  steps: Step[];
  current: number;
}) {
  return (
    <ol className="flex items-center gap-1 sm:gap-2" aria-label="Booking steps">
      {steps.map((s, i) => {
        const isDone = s.id < current;
        const isActive = s.id === current;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-1 sm:gap-2">
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                isDone && 'bg-brand-600 border-brand-600 text-white',
                isActive && 'border-brand-600 text-brand-700 bg-brand-50',
                !isDone && !isActive && 'border-border text-muted-foreground',
              )}
            >
              {isDone ? <Check className="h-3.5 w-3.5" /> : s.id}
            </div>
            <span
              className={cn(
                'hidden text-xs font-medium sm:inline',
                isActive ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className="h-px flex-1 bg-border" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
