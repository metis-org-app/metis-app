import { z } from 'zod';

const incoming = new Headers();
vi.mock('next/headers', () => ({ headers: async () => incoming }));

const secret = 'a-secret-of-at-least-thirty-two-characters';

// env() caches the environment, so each case imports a fresh copy of the modules.
async function callApiWith(proxySecret: string | undefined) {
  vi.resetModules();
  vi.stubEnv('METIS_API_URL', 'http://api.test');
  vi.stubEnv('APP_URL', 'http://app.test');
  vi.stubEnv('METIS_PROXY_SECRET', proxySecret ?? '');
  const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ ok: true }));
  vi.stubGlobal('fetch', fetchMock);

  const { apiRequest } = await import('./server');
  await apiRequest('/api/public/join/ABCDEFGH', { schema: z.object({ ok: z.boolean() }) });

  const init = fetchMock.mock.calls[0]?.[1];
  return init?.headers as Record<string, string>;
}

describe('apiRequest client IP headers', () => {
  beforeEach(() => {
    incoming.set('x-nf-client-connection-ip', '190.22.13.4');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends the client IP and the proxy secret when the secret is configured', async () => {
    const headers = await callApiWith(secret);
    expect(headers['X-Metis-Client-IP']).toBe('190.22.13.4');
    expect(headers['X-Metis-Proxy-Secret']).toBe(secret);
    expect(headers).not.toHaveProperty('X-Forwarded-For');
  });

  it('sends X-Forwarded-For and no secret without it', async () => {
    const headers = await callApiWith(undefined);
    expect(headers['X-Forwarded-For']).toBe('190.22.13.4');
    expect(headers).not.toHaveProperty('X-Metis-Proxy-Secret');
    expect(headers).not.toHaveProperty('X-Metis-Client-IP');
  });
});
