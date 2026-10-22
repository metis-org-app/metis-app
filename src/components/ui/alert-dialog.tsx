'use client';

import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { buttonVariants } from './button';
import { overlayClassName, surfaceClassName } from './dialog';

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

type AlertDialogContentProps = {
  title: string;
  description: ReactNode;
  /** Label of the confirming button. It says what happens ("Archivar curso"), never just "Aceptar". */
  confirmLabel: string;
  /**
   * The action removes, archives or invalidates something: the confirm button uses the `danger` variant instead of
   * the primary one with the gold shadow, which is reserved for constructive actions.
   */
  destructive?: boolean;
  onConfirm: () => void;
  /** Shown while the confirmed action runs; the dialog stays open so errors can be shown in place. */
  pending?: boolean;
  pendingLabel?: string;
  /** Error from the last attempt, rendered inside the dialog. */
  error?: ReactNode;
  cancelLabel?: string;
};

/**
 * Confirmation for an action that is hard to undo. The confirm button does not close the dialog by itself: the caller
 * closes it (controlled `open`) when the action succeeds.
 */
export function AlertDialogContent({
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
  pending = false,
  pendingLabel,
  error,
  cancelLabel = 'Cancelar',
}: AlertDialogContentProps) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className={overlayClassName} />
      <AlertDialogPrimitive.Content className={cn(surfaceClassName, 'max-w-md')}>
        <div className="grid gap-2">
          <AlertDialogPrimitive.Title className="font-display text-2xl font-semibold">
            {title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="text-ink-soft">
            {description}
          </AlertDialogPrimitive.Description>
        </div>
        {error}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <AlertDialogPrimitive.Cancel
            className={buttonVariants({ variant: 'secondary' })}
            disabled={pending}
          >
            {cancelLabel}
          </AlertDialogPrimitive.Cancel>
          <button
            type="button"
            className={buttonVariants({ variant: destructive ? 'danger' : 'primary' })}
            onClick={onConfirm}
            disabled={pending}
            aria-disabled={pending}
          >
            {pending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </button>
        </div>
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  );
}
