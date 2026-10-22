import { z } from 'zod';
import {
  assessmentIdSchema,
  assessmentItemSchema,
  assessmentSchema,
  type Assessment,
  type AssessmentItem,
  type ItemRequest,
} from './contract';
import { fieldErrorsFromProblem, MESSAGES, messageForStatus, parseProblem, type FieldErrors } from './errors';

/*
 * Calls the editor makes from the browser. They go to /api/... on this origin, and the route handler forwards them to
 * metis-api with the session token (see "Talking to metis-api" in CLAUDE.md). Responses are validated like on the
 * server, and failures come back as Spanish messages, never the API's text.
 */

export type RequestFailure = {
  ok: false;
  /** Errors next to fields (a 400 naming them). The teacher fixes them; retrying the same data would fail again. */
  fieldErrors: FieldErrors;
  /** General message when the failure is not about one field. */
  message?: string;
  /** Retrying the same request may work (network, 409, 429, 5xx). */
  retryable: boolean;
  /** HTTP status, when the API answered. */
  status?: number;
};

export type RequestResult<T> = { ok: true; data: T } | RequestFailure;

const noContent = z.undefined();

async function send<T>(
  path: `/api/assessments/${string}`,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  schema: z.ZodType<T>,
  body?: unknown,
  notFound?: string,
): Promise<RequestResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    return { ok: false, fieldErrors: {}, message: MESSAGES.unavailable, retryable: true };
  }

  if (response.status === 401) {
    // The session expired: same destination as the server actions. A full navigation on purpose: /salir is a route
    // handler that clears the cookie, and the editor's in-memory state must go too.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/salir?motivo=expirada');
    return { ok: false, fieldErrors: {}, retryable: false };
  }

  const payload: unknown = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) {
    const fieldErrors = response.status === 400 ? fieldErrorsFromProblem(parseProblem(payload)) : {};
    const hasFields = Object.keys(fieldErrors).length > 0;
    return {
      ok: false,
      fieldErrors,
      ...(hasFields ? {} : { message: messageForStatus(response.status, notFound) }),
      retryable: response.status === 409 || response.status === 429 || response.status >= 500,
      status: response.status,
    };
  }

  const parsed = schema.safeParse(payload);
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, fieldErrors: {}, message: MESSAGES.invalid, retryable: false };
}

function base(assessmentId: string) {
  // Ids come from server-rendered props, but they still must be UUIDs before reaching a path.
  if (!assessmentIdSchema.safeParse(assessmentId).success) throw new Error('Invalid assessment id');
  return `/api/assessments/${assessmentId}` as const;
}

export const editorApi = {
  updateDetails: (assessmentId: string, details: { title: string; instructions: string | null }) =>
    send<Assessment>(base(assessmentId), 'PUT', assessmentSchema, details),
  createItem: (assessmentId: string, item: ItemRequest) =>
    send<AssessmentItem>(`${base(assessmentId)}/items`, 'POST', assessmentItemSchema, item),
  updateItem: (assessmentId: string, itemId: string, item: ItemRequest) =>
    send<AssessmentItem>(
      `${base(assessmentId)}/items/${assessmentIdSchema.parse(itemId)}`,
      'PUT',
      assessmentItemSchema,
      item,
      MESSAGES.itemNotFound,
    ),
  deleteItem: (assessmentId: string, itemId: string) =>
    send(
      `${base(assessmentId)}/items/${assessmentIdSchema.parse(itemId)}`,
      'DELETE',
      noContent,
      undefined,
      MESSAGES.itemNotFound,
    ),
  reorderItems: (assessmentId: string, itemIds: string[]) =>
    send<AssessmentItem[]>(`${base(assessmentId)}/items/order`, 'PUT', z.array(assessmentItemSchema), {
      itemIds,
    }),
};
