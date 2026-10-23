import { toUpstreamPath, upstreamTimeoutMs } from './upstream-path';

describe('toUpstreamPath', () => {
  it('maps plain segments to the metis-api path', () => {
    expect(toUpstreamPath(['workspaces', '0199f0c2-7a1b-7c3d-9e2f-1a2b3c4d5e6f', 'students'])).toBe(
      '/api/workspaces/0199f0c2-7a1b-7c3d-9e2f-1a2b3c4d5e6f/students',
    );
  });

  it.each([
    [[]],
    [['..', 'admin']],
    [['workspaces', '%2e%2e']],
    [['a b']],
    [['auth', 'login']],
    [['Auth', 'me']],
  ])('rejects %j', (segments) => {
    expect(toUpstreamPath(segments)).toBeNull();
  });
});

describe('upstreamTimeoutMs', () => {
  it('gives AI generation 150 s and every other route 60 s', () => {
    expect(upstreamTimeoutMs('/api/assessments/generate')).toBe(150_000);
    expect(upstreamTimeoutMs('/api/assessments')).toBe(60_000);
    expect(upstreamTimeoutMs('/api/assessments/generate/extra')).toBe(60_000);
  });
});
