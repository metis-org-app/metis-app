import { z } from 'zod';
import { loginSchema, registerSchema } from './schemas';

describe('auth schemas', () => {
  it('normalizes the email before sending it', () => {
    const result = loginSchema.parse({ email: '  Profe@Colegio.CL ', password: 'x' });
    expect(result.email).toBe('profe@colegio.cl');
  });

  it('reports every invalid register field in Spanish', () => {
    const result = registerSchema.safeParse({ name: ' ', email: 'no-es-email', password: 'corta' });
    expect(result.success).toBe(false);
    const errors = result.error && z.flattenError(result.error).fieldErrors;
    expect(errors?.name).toEqual(['Escribe tu nombre.']);
    expect(errors?.email?.[0]).toMatch(/formato del email/);
    expect(errors?.password).toEqual(['La contraseña debe tener al menos 8 caracteres.']);
  });
});
