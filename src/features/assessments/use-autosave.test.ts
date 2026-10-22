import { act, renderHook } from '@testing-library/react';
import { useAutosave, type SaveOutcome } from './use-autosave';

type Deferred = { value: string; resolve: (outcome: SaveOutcome) => void };

function setup(initial = 'a', canSave = true) {
  const calls: Deferred[] = [];
  const save = (value: string) =>
    new Promise<SaveOutcome>((resolve) => {
      calls.push({ value, resolve });
    });
  const hook = renderHook((props: { value: string; canSave: boolean }) => useAutosave({ ...props, save }), {
    initialProps: { value: initial, canSave },
  });
  return { calls, ...hook };
}

const ok: SaveOutcome = { ok: true };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useAutosave', () => {
  it('starts saved and waits 800 ms after the last change before saving once', async () => {
    const { calls, result, rerender } = setup();
    expect(result.current.status).toEqual({ state: 'saved' });

    rerender({ value: 'ab', canSave: true });
    await act(() => vi.advanceTimersByTimeAsync(500));
    rerender({ value: 'abc', canSave: true });
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(calls).toHaveLength(0);
    expect(result.current.status).toEqual({ state: 'pending', blocked: false });

    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(calls.map((call) => call.value)).toEqual(['abc']);
    expect(result.current.status).toEqual({ state: 'saving' });

    await act(async () => calls[0]!.resolve(ok));
    expect(result.current.status).toEqual({ state: 'saved' });
  });

  it('does not lose a change made while a save is running', async () => {
    const { calls, result, rerender } = setup();

    rerender({ value: 'first', canSave: true });
    await act(() => vi.advanceTimersByTimeAsync(800));
    expect(calls.map((call) => call.value)).toEqual(['first']);

    // The teacher keeps typing while the request is in flight.
    rerender({ value: 'second', canSave: true });
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(calls).toHaveLength(1); // never two saves at once

    await act(async () => calls[0]!.resolve(ok));
    // The first save finished, but the screen holds a newer version: not "Guardado" yet.
    expect(result.current.status).toEqual({ state: 'pending', blocked: false });

    await act(() => vi.advanceTimersByTimeAsync(800));
    expect(calls.map((call) => call.value)).toEqual(['first', 'second']);
    await act(async () => calls[1]!.resolve(ok));
    expect(result.current.status).toEqual({ state: 'saved' });
  });

  it('keeps the changes after a failure and saves them again on retry', async () => {
    const { calls, result, rerender } = setup();

    rerender({ value: 'edited', canSave: true });
    await act(() => vi.advanceTimersByTimeAsync(800));
    await act(async () =>
      calls[0]!.resolve({ ok: false, fieldErrors: {}, message: 'Sin conexión', retryable: true }),
    );
    expect(result.current.status).toEqual({
      state: 'error',
      fieldErrors: {},
      message: 'Sin conexión',
      retryable: true,
    });

    act(() => result.current.retry());
    expect(calls.map((call) => call.value)).toEqual(['edited', 'edited']);
    await act(async () => calls[1]!.resolve(ok));
    expect(result.current.status).toEqual({ state: 'saved' });
  });

  it('reports the field errors of a rejected save until the teacher changes the value', async () => {
    const { calls, result, rerender } = setup();

    rerender({ value: 'bad', canSave: true });
    await act(() => vi.advanceTimersByTimeAsync(800));
    await act(async () =>
      calls[0]!.resolve({ ok: false, fieldErrors: { prompt: 'Revisa el enunciado' }, retryable: false }),
    );
    expect(result.current.status).toMatchObject({
      state: 'error',
      fieldErrors: { prompt: 'Revisa el enunciado' },
    });

    rerender({ value: 'good', canSave: true });
    expect(result.current.status).toEqual({ state: 'pending', blocked: false });
    await act(() => vi.advanceTimersByTimeAsync(800));
    expect(calls.map((call) => call.value)).toEqual(['bad', 'good']);
  });

  it('does not save an incomplete value and saves it as soon as it is complete', async () => {
    const { calls, result, rerender } = setup();

    rerender({ value: 'incomplete', canSave: false });
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(calls).toHaveLength(0);
    expect(result.current.status).toEqual({ state: 'pending', blocked: true });

    rerender({ value: 'complete', canSave: true });
    await act(() => vi.advanceTimersByTimeAsync(800));
    expect(calls.map((call) => call.value)).toEqual(['complete']);
  });

  it('saves a new, complete value that was never stored without waiting for an edit', async () => {
    const calls: string[] = [];
    renderHook(() =>
      useAutosave({
        value: 'copy',
        canSave: true,
        initiallySaved: false,
        save: async (value) => {
          calls.push(value);
          return ok;
        },
      }),
    );

    await act(() => vi.advanceTimersByTimeAsync(800));
    expect(calls).toEqual(['copy']);
  });
});
