import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { ApiError } from '@/lib/api/server';
import { authApi, type CurrentUser } from './api';
import { getSessionToken } from './session';

/**
 * Data access layer for the session. This is the real authorization check; the redirect in
 * proxy.ts is only an optimistic shortcut based on the cookie being present.
 * Memoized per request with React `cache`, so layouts and pages can call it freely.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    return await authApi.me(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});

/** Returns the signed-in user or ends the request with a redirect to the sign-in page. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  // Server components cannot delete cookies, so an expired token is cleared by /salir.
  if (!user) redirect('/salir?motivo=expirada');
  return user;
}
