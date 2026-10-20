import { cn } from '@/lib/cn';

/** Brand mark from the landing: an ink tile with a gold offset shadow. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-[0.7rem] bg-ink font-display text-lg leading-none font-semibold text-gold shadow-offset-sm',
        className,
      )}
    >
      M
    </span>
  );
}

export function Logo({ tone = 'ink', className }: { tone?: 'ink' | 'paper'; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <BrandMark className={tone === 'paper' ? 'bg-paper text-ink' : undefined} />
      <span
        className={cn(
          'font-display text-[1.15rem] font-semibold tracking-wide',
          tone === 'paper' ? 'text-paper' : 'text-ink',
        )}
      >
        Metis <span className="font-normal opacity-70">Campus</span>
      </span>
    </span>
  );
}
