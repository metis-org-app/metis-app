/**
 * CSRF check for route handlers that change data: the request must come from a page of this origin. Server actions
 * have it built in; the /api proxy and the submission route handlers check it themselves.
 */
export function isSameOrigin(request: Request & { nextUrl?: URL }) {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite) return fetchSite === 'same-origin';
  const origin = request.nextUrl?.origin ?? new URL(request.url).origin;
  return request.headers.get('origin') === origin;
}
