import { safeRedirect } from './safe-redirect';

describe('safeRedirect', () => {
  it('keeps same-origin paths with their query', () => {
    expect(safeRedirect('/evaluaciones?estado=borrador')).toBe('/evaluaciones?estado=borrador');
  });

  it.each([
    null,
    undefined,
    '',
    'inicio',
    '//evil.com',
    '/\\evil.com',
    'https://evil.com',
    'javascript:alert(1)',
  ])('falls back for %s', (target) => {
    expect(safeRedirect(target)).toBe('/inicio');
  });
});
