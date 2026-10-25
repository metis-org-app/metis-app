'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { saveResponses, type ClockSync } from './client-api';
import { ResponseQueue, type QueueStatus } from './response-queue';

function subscribeToConnection(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/**
 * The submission's autosave (see ResponseQueue) wired to the browser: it saves right away when the connection comes
 * back, reports when the browser is offline before any save fails, and passes the server clock of every save on.
 */
export function useResponseAutosave(shareToken: string, onSync: (sync: ClockSync) => void) {
  const [status, setStatus] = useState<QueueStatus>({ state: 'saved', unsaved: 0 });
  const online = useSyncExternalStore(
    subscribeToConnection,
    () => navigator.onLine,
    () => true,
  );

  // The clock of each save travels through an event, so the queue (created once) never holds a stale callback.
  const [{ queue, syncs }] = useState(() => {
    const target = new EventTarget();
    return {
      syncs: target,
      queue: new ResponseQueue({
        onStatus: setStatus,
        send: async (changes) => {
          const { outcome, sync } = await saveResponses(shareToken, changes);
          if (sync) target.dispatchEvent(new CustomEvent<ClockSync>('sync', { detail: sync }));
          return outcome;
        },
      }),
    };
  });

  useEffect(() => {
    const listener = (event: Event) => onSync((event as CustomEvent<ClockSync>).detail);
    syncs.addEventListener('sync', listener);
    return () => syncs.removeEventListener('sync', listener);
  }, [syncs, onSync]);

  useEffect(() => {
    const flush = () => void queue.flush();
    window.addEventListener('online', flush);
    return () => {
      window.removeEventListener('online', flush);
      queue.stop();
    };
  }, [queue]);

  return { queue, status, online };
}
