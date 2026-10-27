import type { HttpValidationProblemDetails, ProblemDetails } from './types';

/**
 * The error both implementations throw. It mirrors what metis-api returns on failure: an HTTP status
 * plus an RFC 9457 Problem Details body (`application/problem+json`). Validation errors carry an
 * HttpValidationProblemDetails body, whose `errors` map holds the field errors.
 */
export class MetisApiError extends Error {
  readonly status: number;
  readonly body: ProblemDetails | HttpValidationProblemDetails;

  constructor(status: number, body: ProblemDetails | HttpValidationProblemDetails) {
    super(body.detail ?? body.title ?? `metis-api responded with ${status}`);
    this.name = 'MetisApiError';
    this.status = status;
    this.body = body;
  }
}

/** Thrown by HttpMetisApi for the operations that are not wired to metis-api yet. */
export class NotImplementedError extends Error {
  constructor(operation: string) {
    super(`${operation} is not implemented`);
    this.name = 'NotImplementedError';
  }
}

export function problemDetails(status: number, title: string, detail?: string | null): ProblemDetails {
  return { type: 'about:blank', title, status, detail: detail ?? null, instance: null };
}

export function validationProblemDetails(
  errors: Record<string, string[]>,
  detail?: string | null,
): HttpValidationProblemDetails {
  return {
    type: 'about:blank',
    title: 'One or more validation errors occurred.',
    status: 400,
    detail: detail ?? null,
    instance: null,
    errors,
  };
}

export function apiError(status: number, title: string, detail?: string | null): MetisApiError {
  return new MetisApiError(status, problemDetails(status, title, detail));
}

export function validationError(errors: Record<string, string[]>, detail?: string | null): MetisApiError {
  return new MetisApiError(400, validationProblemDetails(errors, detail));
}

/** Field errors of a 400/422 body, normalized to `Record<field, messages>`; empty when there are none. */
export function fieldErrorsOf(error: unknown): Record<string, string[]> {
  if (!(error instanceof MetisApiError)) return {};
  const errors = (error.body as HttpValidationProblemDetails).errors;
  return errors ?? {};
}
