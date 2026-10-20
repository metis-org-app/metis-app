import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/features/auth/server';

/**
 * Clears the session and sends the user to sign-in. Used when the DAL finds an expired token
 * (server components cannot delete cookies). Signing out from the UI uses logoutAction.
 */
export function GET(request: NextRequest) {
  const url = new URL('/ingresar', request.url);
  if (request.nextUrl.searchParams.get('motivo') === 'expirada') url.searchParams.set('motivo', 'expirada');
  const response = NextResponse.redirect(url);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
