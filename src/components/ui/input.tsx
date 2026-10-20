import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-control border border-line bg-paper px-3.5 text-[0.9375rem] text-ink transition-colors placeholder:text-ink-soft/70',
        'hover:border-ink-soft/60 focus-visible:border-ink focus-visible:ring-3 focus-visible:ring-gold-soft focus-visible:outline-none',
        'aria-invalid:border-danger aria-invalid:focus-visible:ring-danger-soft',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}
