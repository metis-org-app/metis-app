/** Header with the client IP for metis-api's rate limits; trusted only next to {@link PROXY_SECRET_HEADER}. */
export const CLIENT_IP_HEADER = 'X-Metis-Client-IP';

/** The secret shared with metis-api (`METIS_PROXY_SECRET` here, `ClientIp:ProxySecret` there). */
export const PROXY_SECRET_HEADER = 'X-Metis-Proxy-Secret';

/**
 * Netlify's edge writes the address of the connection it received in this header, over anything the client sent. It
 * is the only client IP header Netlify guarantees (`x-forwarded-for` there keeps what the client sent).
 */
const NETLIFY_CLIENT_IP_HEADER = 'x-nf-client-connection-ip';

/**
 * Normalizes an `x-forwarded-for` value. Next.js fills the header with the socket address when the request does not
 * bring one. When it is a chain ("client, proxy1, proxy2") the last entry is used: it is the address seen by the hop
 * closest to this server, the only one a proxy in front of Next.js would have written.
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

/**
 * The client IP of a request that reached this server: Netlify's header in production, otherwise `x-forwarded-for`
 * (local development, where Next.js writes the socket address there). Outside Netlify a client can send either header
 * itself (see "Security headers" in CLAUDE.md).
 */
export function clientIpFrom(headers: Pick<Headers, 'get'>): string | undefined {
  return (
    forwardedClientIp(headers.get(NETLIFY_CLIENT_IP_HEADER)) ??
    forwardedClientIp(headers.get('x-forwarded-for'))
  );
}

/**
 * The headers that tell metis-api who the client is, so its per-IP rate limits see each student instead of this
 * server. With the proxy secret (production) metis-api reads {@link CLIENT_IP_HEADER} only when the secret matches;
 * without it (development) it reads `X-Forwarded-For` from loopback, its known proxy.
 */
export function upstreamClientHeaders(
  incoming: Pick<Headers, 'get'>,
  proxySecret: string | undefined,
): Record<string, string> {
  const clientIp = clientIpFrom(incoming);
  if (!clientIp) return {};
  return proxySecret
    ? { [CLIENT_IP_HEADER]: clientIp, [PROXY_SECRET_HEADER]: proxySecret }
    : { 'X-Forwarded-For': clientIp };
}
