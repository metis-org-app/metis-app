'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { registerAction } from '../actions';
import type { AuthFormState } from '../schemas';
import { SubmitButton } from './submit-button';

export function RegisterForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(registerAction, {});

  return (
    <form action={formAction} noValidate className="grid gap-5">
      {state.message && <Alert>{state.message}</Alert>}

      <Field id="name" label="Nombre" errors={state.fieldErrors?.name}>
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
            key={`email-${state.values?.email}`}
          />
        )}
      </Field>

      <Field
        id="password"
        label="Contraseña"
        hint="Al menos 8 caracteres. Una frase corta es más fácil de recordar."
        errors={state.fieldErrors?.password}
      >
        {(control) => (
          <PasswordInput {...control} name="password" autoComplete="new-password" required minLength={8} />
        )}
      </Field>

      <SubmitButton pendingLabel="Creando tu cuenta…">Crear cuenta</SubmitButton>
    </form>
  );
}
