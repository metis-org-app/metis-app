'use client';

import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import type { AuthFormState } from '../schemas';

/** Step 2 of sign-in and sign-up: the one-time code Cognito emailed. Shared by both forms. */
export function CodeStep({
  email,
  state,
  submitLabel,
  pendingLabel,
}: {
  email: string;
  state: AuthFormState;
  submitLabel: string;
  pendingLabel: string;
}) {
  return (
    <>
      <p className="text-ink-soft">
        Te enviamos un código a <span className="font-semibold text-ink">{email}</span>. Revisa también la
        carpeta de spam.
      </p>
      {state.notice && (
        <p role="status" className="text-sm text-ink-soft">
          {state.notice}
        </p>
      )}

      <Field id="code" label="Código" errors={state.fieldErrors?.code}>
        {(control) => (
          <Input
            {...control}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={8}
            autoCapitalize="none"
            spellCheck={false}
            required
            autoFocus
            className="tracking-[0.3em]"
          />
        )}
      </Field>

      <SubmitButton name="intent" value="verify" size="lg" className="w-full" pendingLabel={pendingLabel}>
        {submitLabel}
      </SubmitButton>

      <div className="flex items-center justify-between gap-4 text-sm">
        <SubmitButton name="intent" value="resend" variant="link" pendingLabel="Enviando…">
          Reenviar código
        </SubmitButton>
        <SubmitButton name="intent" value="restart" variant="ghost" pendingLabel="Volviendo…">
          Usar otro email
        </SubmitButton>
      </div>
    </>
  );
}
