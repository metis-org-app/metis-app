'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { signInAction } from '../actions';
import type { AuthFormState } from '../schemas';
import { CodeStep } from './code-step';
import { EmailStep } from './email-step';

export function LoginForm({
  redirectTo,
  pendingEmail,
}: {
  redirectTo?: string | undefined;
  pendingEmail?: string;
}) {
  // A reload during the code step lands on it again: the page reads the pending email from the challenge cookie.
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    signInAction,
    pendingEmail ? { step: 'code', values: { email: pendingEmail } } : { step: 'email' },
  );

  return (
    <form action={formAction} noValidate className="grid gap-5">
      {state.message && <Alert>{state.message}</Alert>}
      {redirectTo && <input type="hidden" name="desde" value={redirectTo} />}

      {state.step === 'code' && state.values?.email ? (
        <CodeStep
          email={state.values.email}
          state={state}
          submitLabel="Ingresar"
          pendingLabel="Ingresando…"
        />
      ) : (
        <EmailStep state={state} submitLabel="Enviarme un código" pendingLabel="Enviando código…" />
      )}
    </form>
  );
}
