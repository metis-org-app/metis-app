import { z } from 'zod';

// Limits mirror the metis-api domain (Name max 200, Email max 320, roster upload 1–100).
export const NAME_MAX = 200;
export const ROSTER_MAX = 100;

export const workspaceNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Escribe el nombre del curso.')
    .max(NAME_MAX, 'El nombre es demasiado largo.'),
});

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Escribe el email.')
  .max(320, 'El email es demasiado largo.')
  .pipe(z.email('Revisa el formato del email, por ejemplo nombre@colegio.cl.'));

export const studentSchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre.').max(NAME_MAX, 'El nombre es demasiado largo.'),
  email: emailField,
});

export const rosterSchema = z.array(studentSchema).min(1).max(ROSTER_MAX);

export const joinSchema = z.object({
  name: z.string().trim().min(1, 'Escribe tu nombre.').max(NAME_MAX, 'Tu nombre es demasiado largo.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Escribe tu email.')
    .max(320, 'Tu email es demasiado largo.')
    .pipe(z.email('Revisa el formato de tu email, por ejemplo nombre@gmail.com.')),
});

export type StudentInput = z.infer<typeof studentSchema>;

type Fields = 'name' | 'email';

/** State returned by the form actions of this feature. */
export type FormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Partial<Record<Fields, string[]>>;
  values?: Partial<Record<Fields, string>>;
};

/** Result of actions triggered by a button (archive, regenerate, remove...). */
export type ActionResult = { ok: true } | { ok: false; message: string };

export type RegenerateResult = { ok: true; joinCode: string } | { ok: false; message: string };

export type RosterResult =
  { ok: true; added: number; alreadyEnrolled: string[] } | { ok: false; message: string };

export type JoinFormState = FormState & { workspaceName?: string };
