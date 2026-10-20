import 'server-only';
import type { z } from 'zod';
import { env } from '@/lib/env';
import { parseProblem, type Problem } from './problem';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: Problem | undefined,
  ) {
    super(problem?.detail ?? problem?.title ?? `metis-api responded ${status}`);
    this.name = 'ApiError';
  }
}

/** metis-api could not be reached (down, wrong URL, timeout). */
export class ApiUnavailableError extends Error {
  constructor(cause: unknown) {
    super('metis-api is unavailable', { cause });
    this.name = 'ApiUnavailableError';
  }
}

type RequestOptions<T> = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | undefined;
  /** Validates the response body so a contract drift fails here, not deep inside a component. */
  schema: z.ZodType<T>;
};

/**
 * Server-side call to metis-api. Never import this from client components: the access token and
 * the API URL stay on the server.
 */
export async function apiRequest<T>(path: `/api/${string}`, options: RequestOptions<T>): Promise<T> {
  const { method = 'GET', body, token, schema } = options;
  let response: Response;
  try {
    response = await fetch(new URL(path, env().METIS_API_URL), {
      method,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    throw new ApiUnavailableError(error);
  }

  const payload: unknown = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new ApiError(response.status, parseProblem(payload));
  }
  return schema.parse(payload);
}
