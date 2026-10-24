import { NextResponse, type NextRequest } from 'next/server';
// Imported directly (not through the feature entry) to keep the proxy bundle free of server-only code.
// eslint-disable-next-line no-restricted-imports
import { SESSION_COOKIE } from '@/features/auth/session-cookie';

/** Pages that work without a session. Everything else requires one. */
const GUEST_ONLY = ['/ingresar', '/registro'];
// Students have no account: /unirse is where they join a course with its code, /rendir where an assignment's link opens.
const PUBLIC = ['/salir', '/unirse', '/rendir'];

function matches(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function contentSecurityPolicy(nonce: string) {
  const isDev = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Inline style attributes are needed by React and Radix (positioning); scripts stay strict.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

/**
 * Runs before every page request:
 * 1. Sets a per-request CSP nonce (Next.js applies it to its own scripts).
 * 2. Optimistic auth redirects based on the session cookie. The real check is the DAL
 *    (requireUser), which validates the token against metis-api.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession && !matches(pathname, [...GUEST_ONLY, ...PUBLIC])) {
    const url = new URL('/ingresar', request.url);
    if (pathname !== '/') url.searchParams.set('desde', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  if (hasSession && matches(pathname, GUEST_ONLY)) {
    return NextResponse.redirect(new URL('/inicio', request.url));
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Skip the API proxy, Next.js assets and files with an extension (images, fonts, icons).
      source: '/((?!api/|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
