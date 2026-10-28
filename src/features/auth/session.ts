import 'server-only';
import { cookies } from 'next/headers';
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
  return (await cookies()).get(SESSION_COOKIE)?.value;
}
