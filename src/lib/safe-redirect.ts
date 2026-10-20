/**
 * Returns `target` when it is a same-origin path, otherwise `fallback`.
 * Prevents open redirects through `?desde=` (e.g. `//evil.com` or `https://evil.com`).
 */
export function safeRedirect(target: string | null | undefined, fallback = '/inicio'): string {
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) {
    return fallback;
  }
  try {
    const url = new URL(target, 'http://metis.local');
    return url.origin === 'http://metis.local' ? `${url.pathname}${url.search}` : fallback;
  } catch {
    return fallback;
  }
}
