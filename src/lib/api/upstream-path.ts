const SEGMENT = /^[A-Za-z0-9_-]+$/;

/** Routes the browser may never reach through the proxy: they issue or expose tokens. */
const BLOCKED_PREFIXES = ['auth'];

/**
 * Maps `/api/<segments>` received by the Next.js proxy to the metis-api path, or returns null when
 * the path is not allowed. Only plain segments are accepted, so `..`, encoded slashes and the
 * like can never reach the upstream.
 */
export function toUpstreamPath(segments: readonly string[]): `/api/${string}` | null {
  if (segments.length === 0 || !segments.every((segment) => SEGMENT.test(segment))) {
    return null;
  }
  if (BLOCKED_PREFIXES.includes(segments[0]!.toLowerCase())) {
    return null;
  }
  return `/api/${segments.join('/')}`;
}

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Routes that legitimately take longer than the default. AI generation waits for the model (metis-api gives each attempt
 * up to 120 s) and receives up to 40 MB of files.
 */
const SLOW_ROUTES: Partial<Record<string, number>> = {
  '/api/assessments/generate': 150_000,
};

/** How long the proxy waits for metis-api on this path. */
export function upstreamTimeoutMs(upstreamPath: string): number {
  return SLOW_ROUTES[upstreamPath.toLowerCase()] ?? DEFAULT_TIMEOUT_MS;
}
