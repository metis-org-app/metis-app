import { z } from 'zod';

// Limits mirror the metis-api domain (Name max 200, email max 320, password min 8).
const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Escribe tu email.')
  .max(320, 'El email es demasiado largo.')
  .pipe(z.email('Revisa el formato del email, por ejemplo nombre@colegio.cl.'));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Escribe tu contraseña.'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Escribe tu nombre.').max(200, 'El nombre es demasiado largo.'),
  email,
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(128, 'La contraseña puede tener hasta 128 caracteres.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

/** State returned by the auth server actions to their forms. Passwords are never echoed back. */
export type AuthFormState = {
  message?: string;
  fieldErrors?: Partial<Record<'name' | 'email' | 'password', string[]>>;
  values?: { name?: string; email?: string };
};
