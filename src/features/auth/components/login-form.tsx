'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { loginAction } from '../actions';
import type { AuthFormState } from '../schemas';
import { SubmitButton } from './submit-button';

export function LoginForm({ redirectTo }: { redirectTo?: string | undefined }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(loginAction, {});

  return (
    <form action={formAction} noValidate className="grid gap-5">
      {state.message && <Alert>{state.message}</Alert>}
      {redirectTo && <input type="hidden" name="desde" value={redirectTo} />}

      <Field id="email" label="Email" errors={state.fieldErrors?.email}>
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
            key={state.values?.email}
          />
        )}
      </Field>

      <Field id="password" label="Contraseña" errors={state.fieldErrors?.password}>
        {(control) => <PasswordInput {...control} name="password" autoComplete="current-password" required />}
      </Field>

      <SubmitButton pendingLabel="Ingresando…">Ingresar</SubmitButton>
    </form>
  );
}
