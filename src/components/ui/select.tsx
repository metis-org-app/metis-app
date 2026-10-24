import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/** Native select styled like Input: keyboard, screen readers and the phone's own picker work as usual. */
export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-11 w-full appearance-none rounded-control border border-line bg-paper pr-10 pl-3.5 text-[0.9375rem] text-ink transition-colors',
          'hover:border-ink-soft/60 focus-visible:border-ink focus-visible:ring-3 focus-visible:ring-gold-soft focus-visible:outline-none',
          'aria-invalid:border-danger aria-invalid:focus-visible:ring-danger-soft',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-soft"
      />
    </div>
  );
}
