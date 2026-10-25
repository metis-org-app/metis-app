import { z } from 'zod';

export const startSchema = z.object({
  email: z.email({ message: 'Escribe tu email completo, por ejemplo ana@colegio.cl.' }).trim(),
});

export type StartFormState = {
  message?: string;
  fieldErrors?: { email?: string[] };
  values?: { email: string };
};
