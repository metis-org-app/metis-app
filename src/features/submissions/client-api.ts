import { parseProblem } from '@/lib/api/problem';
import {
  savedResponsesSchema,
  studentSubmissionSchema,
  submitResultSchema,
  type StudentSubmission,
} from './contract';
import type { ResponseChange, SendOutcome } from './response-queue';

/*
 * Browser calls of the submission screen. They go to the route handlers under the link's own path
 * (`/rendir/<shareToken>/sesion/*`), which add the access key from the httpOnly cookie: autosave cannot be a server
 * action (it must not re-render the page on every save) and the generic /api proxy never receives that cookie.
 */

/** Server time and deadline from a response, with when it was sent and received, to correct the device's clock. */
export type ClockSync = { deadline: string; serverNow: string; sentAt: number; receivedAt: number };

type Failure = Exclude<SendOutcome, { kind: 'saved' }>['kind'];

const base = (shareToken: string) => `/rendir/${shareToken}/sesion`;

/** What a failed response means for the screen. */
export function failureFor(status: number, body: unknown): Failure {
  const code = parseProblem(body)?.code;
  if (status === 409) return code === 'submissionClosed' ? 'closed' : 'retry';
  if (status === 401 || status === 404) return 'session';
  if (status === 400) return 'invalid';
  return 'retry';
}

async function call(url: string, init: RequestInit) {
  const sentAt = Date.now();
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const body: unknown = await response.json().catch(() => undefined);
  return { response, body, sentAt, receivedAt: Date.now() };
}

export async function saveResponses(
  shareToken: string,
  changes: ResponseChange[],
): Promise<{ outcome: SendOutcome; sync?: ClockSync }> {
  let result;
  try {
    result = await call(`${base(shareToken)}/respuestas`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ responses: changes }),
    });
  } catch {
    return { outcome: { kind: 'offline' } };
  }
  const { response, body, sentAt, receivedAt } = result;
  if (!response.ok) return { outcome: { kind: failureFor(response.status, body) } };
  const saved = savedResponsesSchema.parse(body);
  return {
    outcome: { kind: 'saved' },
    sync: { deadline: saved.deadline, serverNow: saved.serverNow, sentAt, receivedAt },
  };
}

export async function readSubmission(
  shareToken: string,
): Promise<
  { ok: true; submission: StudentSubmission; sync: ClockSync } | { ok: false; kind: Failure | 'offline' }
> {
  let result;
  try {
    result = await call(base(shareToken), { method: 'GET' });
  } catch {
    return { ok: false, kind: 'offline' };
  }
  const { response, body, sentAt, receivedAt } = result;
  if (!response.ok) return { ok: false, kind: failureFor(response.status, body) };
  const submission = studentSubmissionSchema.parse(body);
  return {
    ok: true,
    submission,
    sync: { deadline: submission.deadline, serverNow: submission.serverNow, sentAt, receivedAt },
  };
}

export async function submitSubmission(
  shareToken: string,
): Promise<{ ok: true } | { ok: false; kind: Failure | 'offline' }> {
  let result;
  try {
    result = await call(`${base(shareToken)}/entrega`, { method: 'POST' });
  } catch {
    return { ok: false, kind: 'offline' };
  }
  if (!result.response.ok) return { ok: false, kind: failureFor(result.response.status, result.body) };
  submitResultSchema.parse(result.body);
  return { ok: true };
}
