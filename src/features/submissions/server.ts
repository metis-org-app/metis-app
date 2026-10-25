// Server-only entry of the submissions feature ("rendiciones" in the UI): the student link's page and route handlers.
import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { lookUpShareToken, type PublicAssignment } from '@/features/assignments/server';
import { upstreamClientHeaders } from '@/lib/api/client-ip';
import { isSameOrigin } from '@/lib/api/same-origin';
import { ApiError, ApiUnavailableError } from '@/lib/api/server';
import { env } from '@/lib/env';
import { publicSubmissionsApi } from './api';
import { shareTokenSchema, type StudentResult, type StudentSubmission } from './contract';
import { getAccessKey, SUBMISSION_COOKIE, submissionCookiePath } from './session';

export type TakePage =
  | { kind: 'answering'; submission: StudentSubmission }
  | { kind: 'submitted'; title: string; result: StudentResult }
  | { kind: 'start'; assignment: PublicAssignment }
  | { kind: 'not-found' | 'rate-limited' | 'unavailable' };

/**
 * What `/rendir/<shareToken>` shows. A browser with this link's cookie goes back to its submission (answering, or the
 * result once submitted), even if the teacher regenerated the link since: a started submission keeps its access key.
 * Without one, or with a key that no longer works, the page shows the assignment and the email entry.
 */
export async function loadTakePage(rawShareToken: string): Promise<TakePage> {
  if (!shareTokenSchema.safeParse(rawShareToken).success) return { kind: 'not-found' };

  const accessKey = await getAccessKey();
  if (accessKey) {
    try {
      const submission = await publicSubmissionsApi.get(accessKey);
      if (submission.status === 'InProgress') return { kind: 'answering', submission };
      return {
        kind: 'submitted',
        title: submission.assessmentTitle,
        result: await publicSubmissionsApi.result(accessKey),
      };
    } catch (error) {
      if (error instanceof ApiUnavailableError) return { kind: 'unavailable' };
      if (error instanceof ApiError && error.status === 429) return { kind: 'rate-limited' };
      // 404: the key was rotated on another device or does not exist; the student enters again with their email.
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    }
  }

  const lookup = await lookUpShareToken(rawShareToken);
  return lookup.status === 'found'
    ? { kind: 'start', assignment: lookup.assignment }
    : { kind: lookup.status };
}

export type SubmissionRoute = 'read' | 'save' | 'submit';

const UPSTREAM: Record<SubmissionRoute, { method: 'GET' | 'PUT' | 'POST'; suffix: string }> = {
  read: { method: 'GET', suffix: '' },
  save: { method: 'PUT', suffix: '/responses' },
  submit: { method: 'POST', suffix: '/submit' },
};

const problem = (status: number, title: string, code?: string) =>
  NextResponse.json(
    { title, status, ...(code ? { code } : {}) },
    { status, headers: { 'cache-control': 'no-store' } },
  );

/**
 * The route handlers of `/rendir/<shareToken>/sesion/*`: they read the access key from this link's httpOnly cookie
 * and relay the request to metis-api, passing its status and body through. The browser never sees the key. A key
 * metis-api no longer knows (404) is dropped, so the next load of the page asks for the email again.
 */
export async function relaySubmissionRequest(
  request: NextRequest,
  rawShareToken: string,
  route: SubmissionRoute,
): Promise<Response> {
  const shareToken = shareTokenSchema.safeParse(rawShareToken);
  if (!shareToken.success) return problem(404, 'Not found');
  const { method, suffix } = UPSTREAM[route];
  if (method !== 'GET' && !isSameOrigin(request)) return problem(403, 'Forbidden');

  const accessKey = await getAccessKey();
  if (!accessKey) return problem(401, 'No submission in this browser', 'noSession');

  const headers = new Headers({ accept: 'application/json' });
  const contentType = request.headers.get('content-type');
  if (method === 'PUT' && contentType) headers.set('content-type', contentType);
  // metis-api rate-limits these routes per access key, and caps them per client IP.
  for (const [name, value] of Object.entries(
    upstreamClientHeaders(request.headers, env().METIS_PROXY_SECRET),
  )) {
    headers.set(name, value);
  }

  let upstream: Response;
  try {
    upstream = await fetch(new URL(`/api/public/submissions/${accessKey}${suffix}`, env().METIS_API_URL), {
      method,
      headers,
      body: method === 'PUT' ? request.body : undefined,
      // Required by Node's fetch to stream a request body.
      duplex: 'half',
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(15_000)]),
    } as RequestInit & { duplex: 'half' });
  } catch {
    return problem(502, 'metis-api is unavailable');
  }

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      'cache-control': 'no-store',
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });
  if (upstream.status === 404) {
    response.cookies.delete({ name: SUBMISSION_COOKIE, path: submissionCookiePath(shareToken.data) });
  }
  return response;
}
