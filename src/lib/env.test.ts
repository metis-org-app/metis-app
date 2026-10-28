// env() caches the environment, so each case imports a fresh copy of the module.
async function loadEnv(variables: Record<string, string>) {
  vi.resetModules();
  vi.stubEnv('METIS_API_URL', 'http://api.test');
  vi.stubEnv('APP_URL', 'http://app.test');
  vi.stubEnv('COGNITO_REGION', 'us-east-1');
  vi.stubEnv('COGNITO_CLIENT_ID', 'test-client');
  for (const [name, value] of Object.entries(variables)) vi.stubEnv(name, value);
  const { env } = await import('./env');
  return env;
}

describe('env METIS_PROXY_SECRET', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is optional in development, and an empty value counts as missing', async () => {
    const env = await loadEnv({ NODE_ENV: 'development', METIS_PROXY_SECRET: '' });
    expect(env().METIS_PROXY_SECRET).toBeUndefined();
  });

  it('is required in production', async () => {
    const env = await loadEnv({ NODE_ENV: 'production', METIS_PROXY_SECRET: '' });
    expect(() => env()).toThrow(/METIS_PROXY_SECRET is required in production/);
  });

  it('rejects a short secret', async () => {
    const env = await loadEnv({ NODE_ENV: 'production', METIS_PROXY_SECRET: 'short' });
    expect(() => env()).toThrow(/at least 32 characters/);
  });

  it('accepts a long enough secret in production', async () => {
    const secret = 'a-secret-of-at-least-thirty-two-characters';
    const env = await loadEnv({ NODE_ENV: 'production', METIS_PROXY_SECRET: secret });
    expect(env().METIS_PROXY_SECRET).toBe(secret);
  });
});
