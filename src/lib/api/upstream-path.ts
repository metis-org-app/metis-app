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
