'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { signUpAction } from '../actions';
import type { AuthFormState } from '../schemas';
import { CodeStep } from './code-step';
import { EmailStep } from './email-step';

export function RegisterForm({ pendingEmail }: { pendingEmail?: string }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    signUpAction,
    pendingEmail ? { step: 'code', values: { email: pendingEmail } } : { step: 'email' },
  );

  return (
    <form action={formAction} noValidate className="grid gap-5">
      {state.message && <Alert>{state.message}</Alert>}

      {state.step === 'code' && state.values?.email ? (
        <CodeStep
          email={state.values.email}
          state={state}
          submitLabel="Crear cuenta"
          pendingLabel="Creando tu cuenta…"
        />
      ) : (
        <EmailStep
          state={state}
          hint="Te enviaremos un código para confirmar que es tuyo."
          submitLabel="Crear cuenta"
          pendingLabel="Enviando código…"
        />
      )}
    </form>
  );
}
