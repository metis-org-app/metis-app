'use client';

import { Clock } from 'lucide-react';
import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { startSubmissionAction } from '../actions';
import type { StartFormState } from '../schemas';

/**
 * The email entry of the student link. Before starting it says how long the student has and that the time keeps
 * running; on success the action stores the access key in the link's cookie and reloads into the submission.
 */
export function StartForm({ shareToken, durationLabel }: { shareToken: string; durationLabel: string }) {
  const [state, formAction] = useActionState<StartFormState, FormData>(
    (previous, formData) => startSubmissionAction(shareToken, previous, formData),
    {},
  );

  return (
    <form action={formAction} noValidate className="grid gap-5 border-t border-line pt-5">
      {state.message && <Alert>{state.message}</Alert>}

      <Field
        id="start-email"
        label="Tu email"
        hint="Ingresa con el email que te registró tu profesor."
        errors={state.fieldErrors?.email}
      >
        {(control) => (
          <Input
            {...control}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            defaultValue={state.values?.email}
            key={`email-${state.values?.email}`}
            className="h-12 text-base"
          />
        )}
      </Field>

      <p className="flex gap-3 rounded-control border border-line bg-cream-deep p-4 text-sm">
        <Clock aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          Tienes {durationLabel} desde que empieces.{' '}
          <strong className="font-semibold">
            Cuando empieces, el tiempo corre aunque cierres la página.
          </strong>
        </span>
      </p>

      <SubmitButton pendingLabel="Empezando…" size="lg" className="w-full">
        Empezar
      </SubmitButton>
    </form>
  );
}
