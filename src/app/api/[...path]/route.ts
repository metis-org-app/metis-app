import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/features/auth/server';
import { forwardedClientIp } from '@/lib/api/client-ip';
import { toUpstreamPath } from '@/lib/api/upstream-path';
import { env } from '@/lib/env';

/*
 * Backend-for-frontend proxy: client components call /api/<path> on this origin and the server
 * forwards the request to metis-api with the session token. The token never reaches the browser.
 * Auth endpoints are blocked here; sign-in and sign-up go through server actions.
 */

const FORWARDED_REQUEST_HEADERS = ['accept', 'accept-language', 'content-type'];
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'content-disposition', 'location', 'retry-after'];

function isSameOrigin(request: NextRequest) {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite) return fetchSite === 'same-origin';
  return request.headers.get('origin') === request.nextUrl.origin;
}

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const upstreamPath = toUpstreamPath((await context.params).path);
  if (!upstreamPath) {
    return NextResponse.json({ title: 'Not found', status: 404 }, { status: 404 });
  }
  // Server actions have built-in CSRF protection; this route needs its own for unsafe methods.
  if (!['GET', 'HEAD'].includes(request.method) && !isSameOrigin(request)) {
    return NextResponse.json({ title: 'Forbidden', status: 403 }, { status: 403 });
  }

  const url = new URL(`${upstreamPath}${request.nextUrl.search}`, env().METIS_API_URL);
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) headers.set('authorization', `Bearer ${token}`);
  // Replaces whatever the browser sent: metis-api trusts this header only from us (see lib/api/client-ip.ts).
  const clientIp = forwardedClientIp(request.headers.get('x-forwarded-for'));
  if (clientIp) headers.set('x-forwarded-for', clientIp);

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      // Required by Node's fetch to stream a request body (file uploads).
      duplex: 'half',
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(60_000),
    } as RequestInit & { duplex: 'half' });
  } catch {
    return NextResponse.json(
      { title: 'metis-api is unavailable', status: 502 },
      { status: 502, headers: { 'cache-control': 'no-store' } },
    );
  }

  const responseHeaders = new Headers({ 'cache-control': 'no-store' });
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  const response = new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
  // An expired or revoked token: drop it so the next navigation goes to sign-in.
  if (upstream.status === 401 && token) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
