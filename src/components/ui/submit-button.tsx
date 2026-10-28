'use client';

import { LoaderCircle } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { Button } from './button';

type SubmitButtonProps = {
  children: string;
  pendingLabel: string;
  /** Only the primary action of a screen uses `primary` (the gold offset shadow). */
  variant?: 'primary' | 'secondary' | 'ghost' | 'link';
  className?: string;
  size?: 'md' | 'lg';
  /**
   * For a form with several submit buttons: the pair is sent with the form, so the action knows which one was
   * pressed, and only that button shows its pending label (the others are just disabled).
   */
  name?: string;
  value?: string;
};

/** Submit button that shows progress and blocks double submits while the form action runs. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
  className,
  size = 'md',
  name,
  value,
}: SubmitButtonProps) {
  const { pending, data } = useFormStatus();
  const isMine = pending && (name === undefined || data?.get(name) === value);
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      aria-disabled={pending}
      {...(name !== undefined ? { name, value } : {})}
    >
      {isMine ? (
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
