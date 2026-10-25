/*
 * The countdown of a submission. metis-api owns the deadline; the browser only shows how much is left, measured with
 * the server's clock: every response brings `serverNow`, and the difference with this device's clock is kept as an
 * offset, so a phone whose clock is minutes off still shows the real time left.
 */

/** Below this, the timer is highlighted. */
export const URGENT_MS = 5 * 60_000;

/** Server time minus device time. The response is assumed to be stamped halfway through the request. */
export function clockOffset(serverNow: string, sentAt: number, receivedAt: number) {
  return Date.parse(serverNow) - (sentAt + receivedAt) / 2;
}

export function remainingMs(deadline: string, offset: number, deviceNow: number) {
  return Math.max(0, Date.parse(deadline) - (deviceNow + offset));
}

/** "12:05" or "1:02:05". Rounded up, so "0:00" is shown only when the time is really up. */
export function formatRemaining(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** The time left in words, for the timer's accessible name. */
export function remainingInWords(ms: number) {
  const minutes = Math.ceil(ms / 60_000);
  if (ms <= 0) return 'Se acabó el tiempo';
  if (minutes <= 1) return 'Queda menos de 1 minuto';
  return `Quedan ${minutes} minutos`;
}

/**
 * The content of the timer's polite live region. It changes only when the time left crosses 5 minutes and 1 minute,
 * so a screen reader hears it twice instead of every second.
 */
export function timeWarning(ms: number) {
  if (ms <= 0) return 'Se acabó el tiempo.';
  if (ms <= 60_000) return 'Queda menos de 1 minuto.';
  if (ms <= URGENT_MS) return 'Quedan menos de 5 minutos.';
  return '';
}
