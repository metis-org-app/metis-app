import { clientIpFrom, forwardedClientIp, upstreamClientHeaders } from './client-ip';

describe('forwardedClientIp', () => {
  it('uses the socket address Next.js puts in the header', () => {
    expect(forwardedClientIp('::1')).toBe('::1');
    expect(forwardedClientIp('190.22.13.4')).toBe('190.22.13.4');
  });

  it('takes the hop closest to this server from a chain', () => {
    expect(forwardedClientIp('203.0.113.9, 10.0.0.2')).toBe('10.0.0.2');
  });

  it('drops missing or malformed values', () => {
    expect(forwardedClientIp(null)).toBeUndefined();
    expect(forwardedClientIp('')).toBeUndefined();
    expect(forwardedClientIp('evil\r\nX-Injected: 1')).toBeUndefined();
    expect(forwardedClientIp('not-an-ip')).toBeUndefined();
  });
});

describe('clientIpFrom', () => {
  it("prefers Netlify's connection header over x-forwarded-for", () => {
    const headers = new Headers({ 'x-nf-client-connection-ip': '190.22.13.4', 'x-forwarded-for': '6.6.6.6' });
    expect(clientIpFrom(headers)).toBe('190.22.13.4');
  });

  it('falls back to x-forwarded-for outside Netlify', () => {
    expect(clientIpFrom(new Headers({ 'x-forwarded-for': '::1' }))).toBe('::1');
    expect(
      clientIpFrom(new Headers({ 'x-nf-client-connection-ip': 'bogus', 'x-forwarded-for': '::1' })),
    ).toBe('::1');
  });

  it('is undefined without a usable header', () => {
    expect(clientIpFrom(new Headers())).toBeUndefined();
  });
});

describe('upstreamClientHeaders', () => {
  const secret = 'a-secret-of-at-least-thirty-two-characters';

  it('sends the client IP with the proxy secret when there is one', () => {
    const headers = new Headers({ 'x-nf-client-connection-ip': '190.22.13.4' });
    expect(upstreamClientHeaders(headers, secret)).toEqual({
      'X-Metis-Client-IP': '190.22.13.4',
      'X-Metis-Proxy-Secret': secret,
    });
  });

  it('sends X-Forwarded-For without a secret (development)', () => {
    expect(upstreamClientHeaders(new Headers({ 'x-forwarded-for': '::1' }), undefined)).toEqual({
      'X-Forwarded-For': '::1',
    });
  });

  it('sends nothing, not even the secret, when the client IP is unknown', () => {
    expect(upstreamClientHeaders(new Headers(), secret)).toEqual({});
  });
});
