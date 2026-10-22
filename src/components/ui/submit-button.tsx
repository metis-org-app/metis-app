'use client';

import { LoaderCircle } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { Button } from './button';

type SubmitButtonProps = {
  children: string;
  pendingLabel: string;
  /** Only the primary action of a screen uses `primary` (the gold offset shadow). */
  variant?: 'primary' | 'secondary';
  className?: string;
  size?: 'md' | 'lg';
};

/** Submit button that shows progress and blocks double submits while the form action runs. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
  className,
  size = 'md',
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden className="animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
