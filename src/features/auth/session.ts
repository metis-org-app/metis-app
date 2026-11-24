import 'server-only';
import { cookies } from 'next/headers';
import { devSessionToken } from '@/lib/api/dev-session';
import { env } from '@/lib/env';
import { SESSION_COOKIE } from './session-cookie';

/**
 * The Cognito access token lives in an httpOnly cookie: JavaScript in the browser can never read it, and
 * requests to metis-api go through the Next.js server (server components, actions and /api proxy).
 */
export async function setSession(accessToken: string, expiresInSeconds: number) {
  (await cookies()).set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure: env().NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: expiresInSeconds,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSessionToken() {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (value) return value;
  // In development there is always a session: the owners work on the app without signing in.
  return devSessionToken();
}
