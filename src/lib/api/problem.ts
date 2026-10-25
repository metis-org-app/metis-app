import { z } from 'zod';

/** RFC 9457 Problem Details, as returned by metis-api (ASP.NET Core ProblemDetails). */
const problemSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number().optional(),
  detail: z.string().optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
  // Set by metis-api on the conflicts a client must tell apart (e.g. "alreadyStarted", "submissionClosed").
  code: z.string().optional(),
});

export type Problem = z.infer<typeof problemSchema>;

export function parseProblem(body: unknown): Problem | undefined {
  const result = problemSchema.safeParse(body);
  return result.success ? result.data : undefined;
}

/**
 * Validation errors keyed by field, with keys normalized to camelCase ("Email" → "email",
 * "request.Password" → "password") so they match the form field names.
 */
export function fieldErrorsFrom(problem: Problem | undefined): Record<string, string[]> {
  const entries = Object.entries(problem?.errors ?? {}).map(([key, messages]) => {
    const last = key.split('.').at(-1) ?? key;
    return [last.charAt(0).toLowerCase() + last.slice(1), messages] as const;
  });
  return Object.fromEntries(entries);
}
