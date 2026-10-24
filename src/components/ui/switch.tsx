'use client';

import { Switch as SwitchPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/**
 * On/off control for a setting that applies at once or with its form. Inside a form with a `name` it submits "on"
 * when checked and nothing when not, like a checkbox. Label it with <label htmlFor> or aria-labelledby.
 */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-line transition-colors',
        'focus-visible:ring-3 focus-visible:ring-gold-soft focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-55 data-[state=checked]:bg-ink',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 rounded-full bg-paper shadow-sm transition-transform data-[state=checked]:translate-x-5" />
    </SwitchPrimitive.Root>
  );
}
