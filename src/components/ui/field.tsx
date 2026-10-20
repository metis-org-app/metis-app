import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Label } from './label';

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  errors?: string[] | undefined;
  /** Optional element aligned to the right of the label, e.g. a "forgot password" link. */
  aside?: ReactNode;
  className?: string;
  /** Receives the ARIA attributes the control needs to announce its hint and errors. */
  children: (control: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode;
};

/** Label, control, hint and error message wired together for assistive technology. */
export function Field({ id, label, hint, errors, aside, className, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = errors?.length ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('grid gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <Label htmlFor={id}>{label}</Label>
        {aside}
      </div>
      {children({
        id,
        ...(errorId ? { 'aria-invalid': true as const } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      })}
      {errorId ? (
        <p id={errorId} className="text-sm text-danger">
          {errors?.join(' ')}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
