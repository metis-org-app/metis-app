'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import type { ClockSync } from './client-api';
import { clockOffset, remainingMs, timeWarning } from './timer';

/** The device clock as a store that ticks every second; null while rendering on the server and hydrating. */
function createTicker() {
  let now = Date.now();
  return {
    subscribe(onChange: () => void) {
      now = Date.now();
      const interval = setInterval(() => {
        now = Date.now();
        onChange();
      }, 1_000);
      return () => clearInterval(interval);
    },
    getSnapshot: () => now,
    getServerSnapshot: () => null,
  };
}

/**
 * The time left of a submission, ticking every second with the server's clock. `remaining` is null on the server (it
 * would render a different time than the browser). Every response that brings `serverNow` and `deadline` (autosave,
 * re-reads) calls `sync`, so an extension of the due date or a drifting device clock is picked up.
 */
export function useCountdown(initial: { deadline: string; serverNow: string }) {
  // The page was rendered moments ago, so its serverNow against the device clock is a good first estimate.
  const [clock, setClock] = useState(() => {
    const at = Date.now();
    return { deadline: initial.deadline, offset: clockOffset(initial.serverNow, at, at) };
  });
  const [ticker] = useState(createTicker);
  const now = useSyncExternalStore(ticker.subscribe, ticker.getSnapshot, ticker.getServerSnapshot);

  const remaining = now === null ? null : remainingMs(clock.deadline, clock.offset, now);

  const sync = useCallback(({ deadline, serverNow, sentAt, receivedAt }: ClockSync) => {
    setClock({ deadline, offset: clockOffset(serverNow, sentAt, receivedAt) });
  }, []);

  return { remaining, sync, announcement: remaining === null ? '' : timeWarning(remaining) };
}
