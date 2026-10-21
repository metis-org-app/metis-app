'use client';

import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { FormState } from '../schemas';

/** Name and email inputs shared by the add and edit student forms. `idPrefix` keeps ids unique on the page. */
export function StudentFields({
  idPrefix,
  state,
  defaults,
}: {
  idPrefix: string;
  state: FormState;
  defaults?: { name: string; email: string };
}) {
  const name = state.values?.name ?? defaults?.name;
  const email = state.values?.email ?? defaults?.email;

  return (
    <>
      <Field id={`${idPrefix}-name`} label="Nombre" errors={state.fieldErrors?.name}>
        {(control) => (
          <Input
            {...control}
            name="name"
            autoComplete="off"
            required
            maxLength={200}
            defaultValue={name}
            key={`name-${name}`}
          />
        )}
      </Field>
      <Field id={`${idPrefix}-email`} label="Email" errors={state.fieldErrors?.email}>
        {(control) => (
          <Input
            {...control}
            name="email"
            type="email"
            autoComplete="off"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            defaultValue={email}
            key={`email-${email}`}
          />
        )}
      </Field>
    </>
  );
}
