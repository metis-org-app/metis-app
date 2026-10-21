/**
 * The client IP to forward to metis-api in `X-Forwarded-For`, so its per-IP rate limit sees each student instead of
 * this server. Next.js fills `x-forwarded-for` with the socket address when the request does not bring one, so the
 * header is always the source. When it is a chain ("client, proxy1, proxy2") the last entry is used: it is the
 * address seen by the hop closest to this server, the only one a proxy in front of Next.js would have written.
 *
 * Without a proxy in front, a client can send any value here (see "Security headers" in CLAUDE.md).
 */
export function forwardedClientIp(header: string | null | undefined): string | undefined {
  const last = header
    ?.split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1);
  // Only plain IPv4/IPv6 characters; anything else is dropped rather than forwarded.
  return last && /^[0-9A-Fa-f:.]{2,45}$/.test(last) ? last : undefined;
}
