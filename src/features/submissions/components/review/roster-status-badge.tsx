import { cn } from '@/lib/cn';
import type { RosterStatus } from '../../contract';
import { ROSTER_STATUS_LABELS } from '../../review';

const STYLES: Record<RosterStatus, string> = {
  NotStarted: 'border-line bg-paper text-ink-soft',
  InProgress: 'border-gold bg-gold-soft text-ink',
  Submitted: 'border-ink-soft bg-cream-deep text-ink',
  Graded: 'border-success bg-success/10 text-success',
};

/** No ha empezado, En curso, Entregada or Corregida. */
export function RosterStatusBadge({ status, className }: { status: RosterStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold',
        STYLES[status],
        className,
      )}
    >
      {ROSTER_STATUS_LABELS[status]}
    </span>
  );
}
