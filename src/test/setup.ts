import '@testing-library/jest-dom/vitest';

// `server-only` throws outside a React Server Components bundle; tests import server modules directly.
vi.mock('server-only', () => ({}));

// jsdom has no layout, so it lacks ResizeObserver; Radix measures some controls (Switch) with it.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
