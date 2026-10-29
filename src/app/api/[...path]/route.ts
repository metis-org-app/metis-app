import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/features/auth/server';
import { upstreamClientHeaders } from '@/lib/api/client-ip';
import { isSameOrigin } from '@/lib/api/same-origin';
import { toUpstreamPath, upstreamTimeoutMs } from '@/lib/api/upstream-path';
import { env } from '@/lib/env';

/*
 * Backend-for-frontend proxy: client components call /api/<path> on this origin and the server
 * forwards the request to metis-api with the session token. The token never reaches the browser.
 * Auth endpoints are blocked here; sign-in and sign-up go through server actions.
 */

const FORWARDED_REQUEST_HEADERS = ['accept', 'accept-language', 'content-type'];
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'content-disposition', 'location', 'retry-after'];

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
  // Built here, never copied from the browser (only FORWARDED_REQUEST_HEADERS are): metis-api trusts the client IP
  // only with the proxy secret, which only this server knows (see lib/api/client-ip.ts).
  for (const [name, value] of Object.entries(
    upstreamClientHeaders(request.headers, env().METIS_PROXY_SECRET),
  )) {
    headers.set(name, value);
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: request.method,
      headers,
      // The body is passed through as a stream, never read here: a 40 MB upload is not held in memory. proxy.ts does
      // not run on /api/* (see its matcher), so Next.js does not buffer the body either (proxyClientMaxBodySize).
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      // Required by Node's fetch to stream a request body (file uploads).
      duplex: 'half',
      cache: 'no-store',
      redirect: 'manual',
      // Stops waiting when the route's time is up, or when the browser gives up (a cancelled AI generation), so
      // metis-api stops working on a request nobody will read.
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(upstreamTimeoutMs(upstreamPath))]),
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
