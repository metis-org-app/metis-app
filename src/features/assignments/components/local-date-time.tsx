'use client';

import { useSyncExternalStore } from 'react';
import { formatDateTime, SERVER_TIME_ZONE } from '../dates';

const noSubscription = () => () => {};

/**
 * A date in the browser's time zone, in Chilean format. The server cannot know that zone, so the first render uses
 * Chile's and the browser re-renders it with its own right after hydration (no mismatch warning).
 */
export function LocalDateTime({ iso }: { iso: string }) {
  const timeZone = useSyncExternalStore(
    noSubscription,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => SERVER_TIME_ZONE,
  );
  return <time dateTime={iso}>{formatDateTime(iso, timeZone)}</time>;
}

/** "Abre el 2 de noviembre de 2026, 08:00": a sentence from availability.ts with its date. */
export function DatedSentence({ text, date }: { text: string; date?: string | undefined }) {
  return date ? (
    <>
      {text} <LocalDateTime iso={date} />
    </>
  ) : (
    <>{text}</>
  );
}
