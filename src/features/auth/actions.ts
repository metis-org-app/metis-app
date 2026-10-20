'use server';

import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ApiError, ApiUnavailableError } from '@/lib/api/server';
import { fieldErrorsFrom } from '@/lib/api/problem';
import { safeRedirect } from '@/lib/safe-redirect';
import { authApi } from './api';
import { loginSchema, registerSchema, type AuthFormState } from './schemas';
import { clearSession, setSession } from './session';

const UNAVAILABLE = 'No pudimos conectar con Metis. Revisa tu conexión e inténtalo de nuevo en unos minutos.';

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export async function loginAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { email: text(formData, 'email') };
  const parsed = loginSchema.safeParse({ email: values.email, password: text(formData, 'password') });
  if (!parsed.success) {
    return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    const token = await authApi.login(parsed.data);
    await setSession(token.accessToken, token.expiresIn);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 400)) {
      return { values, message: 'El email o la contraseña no coinciden.' };
    }
    if (error instanceof ApiUnavailableError) return { values, message: UNAVAILABLE };
    throw error;
  }

  // safeRedirect guarantees a same-origin path; typed routes cannot know it is a valid page.
  redirect(safeRedirect(text(formData, 'desde')) as Route);
}

export async function registerAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { name: text(formData, 'name'), email: text(formData, 'email') };
  const parsed = registerSchema.safeParse({ ...values, password: text(formData, 'password') });
  if (!parsed.success) {
    return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    const token = await authApi.register(parsed.data);
    await setSession(token.accessToken, token.expiresIn);
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      return {
        values,
        fieldErrors: { email: ['Ya existe una cuenta con este email. Ingresa con tu contraseña.'] },
      };
    }
    if (error instanceof ApiError && error.status === 400) {
      const fieldErrors = fieldErrorsFrom(error.problem);
      return Object.keys(fieldErrors).length > 0
        ? { values, fieldErrors }
        : { values, message: error.problem?.detail ?? 'Revisa los datos e inténtalo de nuevo.' };
    }
    if (error instanceof ApiUnavailableError) return { values, message: UNAVAILABLE };
    throw error;
  }

  redirect('/inicio');
}

export async function logoutAction() {
  await clearSession();
  redirect('/ingresar');
}
