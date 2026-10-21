import { forwardedClientIp } from './client-ip';

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
