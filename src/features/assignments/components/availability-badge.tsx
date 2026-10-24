import { cn } from '@/lib/cn';
import { AVAILABILITY_LABELS } from '../availability';
import type { Availability } from '../contract';

const STYLES: Record<Availability, string> = {
  Scheduled: 'border-line bg-cream-deep text-ink-soft',
  Open: 'border-success/30 bg-paper text-success',
  Closed: 'border-line bg-cream-deep text-ink-soft',
};

/** Programada, Abierta or Cerrada, as metis-api computed it when the page loaded. */
export function AvailabilityBadge({
  availability,
  className,
}: {
  availability: Availability;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        STYLES[availability],
        className,
      )}
    >
      {AVAILABILITY_LABELS[availability]}
    </span>
  );
}
