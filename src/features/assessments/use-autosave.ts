'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FieldErrors } from './errors';

export type SaveOutcome =
  { ok: true } | { ok: false; fieldErrors: FieldErrors; message?: string; retryable: boolean };

export type AutosaveStatus =
  /** Nothing to save: what the teacher sees is what is stored. */
  | { state: 'saved' }
  /** Changes waiting for the debounce, or blocked because the value is incomplete. */
  | { state: 'pending'; blocked: boolean }
  | { state: 'saving' }
  /** The last attempt failed. `fieldErrors` go next to the inputs; `message` is general. */
  | { state: 'error'; fieldErrors: FieldErrors; message?: string; retryable: boolean };

type Options<T> = {
  value: T;
  /** Persists one version of the value. Calls never overlap: a change made while saving is saved right after. */
  save: (value: T) => Promise<SaveOutcome>;
  /** False while the value is incomplete on the client: nothing is sent until it is. */
  canSave: boolean;
  delay?: number;
  /** Starts as `saved` for a value loaded from the server, `pending` for a new one that was never stored. */
  initiallySaved?: boolean;
};

/**
 * Saves `value` a short while after the teacher stops typing. Each change bumps a version; a save records the version
 * it sent, so changes made during a request are never lost or reported as saved: when the request ends, the newer
 * version is saved too. Failures keep the changes and can be retried.
 */
export function useAutosave<T>({ value, save, canSave, delay = 800, initiallySaved = true }: Options<T>) {
  const [status, setStatus] = useState<AutosaveStatus>(
    initiallySaved ? { state: 'saved' } : { state: 'pending', blocked: !canSave },
  );

  const latest = useRef({ value, canSave, save });
  const version = useRef(0);
  const savedVersion = useRef(initiallySaved ? 0 : -1);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastValue = useRef(value);
  const mounted = useRef(true);
  // A save that ends with newer changes schedules the next one through this ref (a callback cannot name itself).
  const runRef = useRef<() => Promise<void>>(async () => undefined);

  const run = useCallback(async () => {
    clearTimeout(timer.current);
    if (saving.current) return; // The running save picks the new version up when it ends.
    const { value: current, canSave: ready, save: persist } = latest.current;
    const sending = version.current;
    if (sending === savedVersion.current) return;
    if (!ready) {
      setStatus({ state: 'pending', blocked: true });
      return;
    }

    saving.current = true;
    setStatus({ state: 'saving' });
    let outcome: SaveOutcome;
    try {
      outcome = await persist(current);
    } catch {
      outcome = { ok: false, fieldErrors: {}, retryable: true };
    }
    saving.current = false;
    if (outcome.ok) savedVersion.current = sending;
    if (!mounted.current) return;

    if (version.current !== sending) {
      // Edited while saving: save the newer version, whatever happened to this one.
      setStatus({ state: 'pending', blocked: !latest.current.canSave });
      timer.current = setTimeout(() => void runRef.current(), delay);
    } else if (outcome.ok) {
      setStatus({ state: 'saved' });
    } else {
      setStatus({
        state: 'error',
        fieldErrors: outcome.fieldErrors,
        retryable: outcome.retryable,
        ...(outcome.message ? { message: outcome.message } : {}),
      });
    }
  }, [delay]);

  useEffect(() => {
    latest.current = { value, canSave, save };
    runRef.current = run;
  });

  // Every new `value` (by identity) is a new version, debounced. Comparing with the previous value, instead of counting
  // effect runs, keeps Strict Mode's extra mount from looking like an edit.
  useEffect(() => {
    if (Object.is(lastValue.current, value)) return;
    lastValue.current = value;
    version.current += 1;
    if (!saving.current) setStatus({ state: 'pending', blocked: !latest.current.canSave });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void run(), delay);
  }, [value, run, delay]);

  // On mount (and Strict Mode's remount), resume a pending save: a new item that is complete, or an edit whose timer
  // was cleared by the unmount.
  useEffect(() => {
    mounted.current = true;
    if (version.current !== savedVersion.current && latest.current.canSave && !saving.current) {
      timer.current = setTimeout(() => void run(), delay);
    }
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, [run, delay]);

  /** Saves now (the "Reintentar" button, or before leaving the editor). */
  const retry = useCallback(() => void run(), [run]);

  return { status, retry };
}
