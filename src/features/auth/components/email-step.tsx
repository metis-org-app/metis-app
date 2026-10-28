'use client';

import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import type { AuthFormState } from '../schemas';

/** Step 1 of sign-in and sign-up: the email Cognito sends the code to. */
export function EmailStep({
  state,
  hint,
  submitLabel,
  pendingLabel,
}: {
  state: AuthFormState;
  hint?: string;
  submitLabel: string;
  pendingLabel: string;
}) {
  return (
    <>
      <Field id="email" label="Email" hint={hint} errors={state.fieldErrors?.email}>
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

      <SubmitButton name="intent" value="start" size="lg" className="w-full" pendingLabel={pendingLabel}>
        {submitLabel}
      </SubmitButton>
    </>
  );
}
