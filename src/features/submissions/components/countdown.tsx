import { Timer } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatRemaining, remainingInWords, URGENT_MS } from '../timer';

/**
 * The time left. Not a live region: it changes every second. The screen announces only the 5- and 1-minute marks,
 * through `announcement`, in a polite region of its own.
 */
export function Countdown({ remaining, announcement }: { remaining: number | null; announcement: string }) {
  const urgent = remaining !== null && remaining <= URGENT_MS;

  return (
    <>
      <p
        role="timer"
        aria-live="off"
        aria-label={remaining === null ? 'Tiempo restante' : remainingInWords(remaining)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold tabular-nums',
          urgent ? 'border-danger bg-danger text-paper' : 'border-line bg-paper text-ink',
        )}
      >
        <Timer aria-hidden className="size-4 shrink-0" />
        {remaining === null ? '--:--' : formatRemaining(remaining)}
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
