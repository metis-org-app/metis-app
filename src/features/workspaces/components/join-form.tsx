'use client';

import { CircleCheck } from 'lucide-react';
import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { joinWorkspaceAction } from '../actions';
import type { JoinFormState } from '../schemas';
import { SubmitButton } from './submit-button';

/** Public form where a student joins a course with its code. */
export function JoinForm({ joinCode }: { joinCode: string }) {
  const [state, formAction] = useActionState<JoinFormState, FormData>(
    (previous, formData) => joinWorkspaceAction(joinCode, previous, formData),
    {},
  );

  if (state.ok) {
    // Same message whether the email was already on the roster or not: the API does not reveal it either.
    return (
      <div role="status" className="grid gap-3">
        <CircleCheck aria-hidden className="size-10 text-success" />
        <h2 className="font-display text-3xl font-semibold">¡Listo, ya estás en el curso!</h2>
        <p className="text-ink-soft">
          Quedaste en la nómina de <strong className="font-semibold text-ink">{state.workspaceName}</strong>.
          Cuando tu profe publique una evaluación, te va a compartir el link para responderla.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="grid gap-5">
      {state.message && <Alert>{state.message}</Alert>}

      <Field
        id="join-name"
        label="Tu nombre"
        hint="Como aparece en la lista del curso."
        errors={state.fieldErrors?.name}
      >
        {(control) => (
          <Input
            {...control}
            name="name"
            autoComplete="name"
            required
            maxLength={200}
            defaultValue={state.values?.name}
            key={`name-${state.values?.name}`}
          />
        )}
      </Field>

      <Field id="join-email" label="Tu email" errors={state.fieldErrors?.email}>
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
          />
        )}
      </Field>

      <SubmitButton pendingLabel="Uniéndote…" size="lg" className="w-full">
        Unirme al curso
      </SubmitButton>
    </form>
  );
}
