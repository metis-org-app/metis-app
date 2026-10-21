'use client';

import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const overlayClassName = 'fixed inset-0 z-50 bg-ink/40';

export const surfaceClassName =
  'fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-surface border border-line bg-paper p-6 text-ink shadow-[0_24px_48px_-20px_rgb(34_27_16/0.45)] focus:outline-none sm:p-7';

type DialogContentProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Modal with a visible title (announced by screen readers), an optional description and a close button. */
export function DialogContent({ title, description, children, className }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClassName} />
      <DialogPrimitive.Content
        className={cn(surfaceClassName, 'max-w-md', className)}
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        <div className="grid gap-1.5 pr-8">
          <DialogPrimitive.Title className="font-display text-2xl font-semibold">
            {title}
          </DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description className="text-ink-soft">{description}</DialogPrimitive.Description>
          )}
        </div>
        {children}
        <DialogPrimitive.Close
          aria-label="Cerrar"
          className="absolute top-4 right-4 grid size-9 place-items-center rounded-full text-ink-soft hover:bg-cream-deep hover:text-ink"
        >
          <X aria-hidden className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
