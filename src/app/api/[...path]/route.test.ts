import { NextRequest } from 'next/server';

const secret = 'a-secret-of-at-least-thirty-two-characters';

// env() caches the environment, so each case imports a fresh copy of the route.
async function proxyWith(proxySecret: string | undefined, browserHeaders: Record<string, string>) {
  vi.resetModules();
  vi.stubEnv('METIS_API_URL', 'http://api.test');
  vi.stubEnv('APP_URL', 'http://app.test');
  vi.stubEnv('COGNITO_REGION', 'us-east-1');
  vi.stubEnv('COGNITO_CLIENT_ID', 'test-client');
  vi.stubEnv('METIS_PROXY_SECRET', proxySecret ?? '');
  const fetchMock = vi.fn<typeof fetch>(async () => Response.json([]));
  vi.stubGlobal('fetch', fetchMock);

  const { GET } = await import('./route');
  const request = new NextRequest('http://app.test/api/workspaces', { headers: browserHeaders });
  await GET(request, { params: Promise.resolve({ path: ['workspaces'] }) });

  const init = fetchMock.mock.calls[0]?.[1];
  return init?.headers as Headers;
}

describe('/api proxy client IP headers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends the client IP and the proxy secret when the secret is configured', async () => {
    const headers = await proxyWith(secret, { 'x-nf-client-connection-ip': '190.22.13.4' });
    expect(headers.get('x-metis-client-ip')).toBe('190.22.13.4');
    expect(headers.get('x-metis-proxy-secret')).toBe(secret);
    expect(headers.get('x-forwarded-for')).toBeNull();
  });

  it('sends X-Forwarded-For and no secret without it', async () => {
    const headers = await proxyWith(undefined, { 'x-forwarded-for': '::1' });
    expect(headers.get('x-forwarded-for')).toBe('::1');
    expect(headers.get('x-metis-proxy-secret')).toBeNull();
  });

  it('never relays client IP headers or a secret the browser made up', async () => {
    const headers = await proxyWith(undefined, {
      'x-forwarded-for': '::1',
      'x-metis-client-ip': '6.6.6.6',
      'x-metis-proxy-secret': 'guessed',
    });
    expect(headers.get('x-metis-client-ip')).toBeNull();
    expect(headers.get('x-metis-proxy-secret')).toBeNull();
  });
});
