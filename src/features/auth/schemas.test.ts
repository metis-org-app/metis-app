import { z } from 'zod';
import { codeSchema, emailSchema } from './schemas';

describe('auth schemas', () => {
  it('normalizes the email before sending it to Cognito', () => {
    const result = emailSchema.parse({ email: '  Profe@Colegio.CL ' });
    expect(result.email).toBe('profe@colegio.cl');
  });

  it('reports an invalid email in Spanish', () => {
    const result = emailSchema.safeParse({ email: 'no-es-email' });
    expect(result.success).toBe(false);
    const errors = result.error && z.flattenError(result.error).fieldErrors;
    expect(errors?.email?.[0]).toMatch(/formato del email/);
  });

  it('accepts a numeric code of 6 to 8 digits and nothing else', () => {
    expect(codeSchema.parse({ code: ' 123456 ' }).code).toBe('123456');
    expect(codeSchema.safeParse({ code: '12345678' }).success).toBe(true);
    expect(codeSchema.safeParse({ code: '12 34 56' }).success).toBe(false);
    expect(codeSchema.safeParse({ code: '12345' }).success).toBe(false);
    const result = codeSchema.safeParse({ code: 'abcdef' });
    const errors = result.error && z.flattenError(result.error).fieldErrors;
    expect(errors?.code).toEqual(['Escribe el código que te enviamos, solo números.']);
  });
});
