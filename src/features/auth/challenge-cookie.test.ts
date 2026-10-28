import { decodeChallenge, encodeChallenge } from './challenge-cookie';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/lib/env', () => ({ env: () => ({ NODE_ENV: 'test' }) }));

describe('challenge cookie codec', () => {
  it('round-trips a sign-in challenge with its session', () => {
    const challenge = { kind: 'signIn' as const, email: 'ana@colegio.cl', session: 'AYABeF…' };
    expect(decodeChallenge(encodeChallenge(challenge))).toEqual(challenge);
  });

  it('round-trips a sign-up challenge without a session', () => {
    const challenge = { kind: 'signUp' as const, email: 'ana@colegio.cl' };
    expect(decodeChallenge(encodeChallenge(challenge))).toEqual(challenge);
  });

  it('ignores a missing, tampered or malformed value', () => {
    expect(decodeChallenge(undefined)).toBeUndefined();
    expect(decodeChallenge('not-base64-json')).toBeUndefined();
    expect(
      decodeChallenge(Buffer.from('{"kind":"other","email":"x"}').toString('base64url')),
    ).toBeUndefined();
  });
});
