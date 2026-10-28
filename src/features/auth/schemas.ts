import { z } from 'zod';

// Limits mirror the metis-api domain (email max 320).
const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Escribe tu email.')
  .max(320, 'El email es demasiado largo.')
  .pipe(z.email('Revisa el formato del email, por ejemplo nombre@colegio.cl.'));

/** Sign-in and sign-up ask only for the email; Cognito sends a code to it. */
export const emailSchema = z.object({ email });

// Cognito emails a numeric one-time code (6 digits for sign-up confirmation; up to 8 for sign-in).
export const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6,8}$/, 'Escribe el código que te enviamos, solo números.'),
});

export type AuthStep = 'email' | 'code';

/** State returned by the auth server actions to their forms. */
export type AuthFormState = {
  step: AuthStep;
  /** An error for the whole form (rendered as an alert). */
  message?: string;
  /** Something that happened and is not an error, e.g. "we sent you a new code". */
  notice?: string;
  fieldErrors?: Partial<Record<'email' | 'code', string[]>>;
  values?: { email?: string };
};
