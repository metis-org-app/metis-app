/*
 * Dates of an assignment. The teacher types them in their own time zone (an <input type="datetime-local"> has no zone)
 * and metis-api receives ISO 8601 with the offset of that moment, so a date on the other side of a daylight saving
 * change gets that side's offset (Chile: -04:00 in winter, -03:00 in summer). Dates are shown in the browser's zone.
 */

const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const pad = (value: number) => String(value).padStart(2, '0');

/** `YYYY-MM-DDTHH:mm` of a date in the zone of this runtime (the browser), as a datetime-local input expects. */
export function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The value for a datetime-local input showing an ISO date from metis-api. */
export const isoToLocalInput = (iso: string) => toLocalInput(new Date(iso));

/**
 * The value of a datetime-local input as ISO 8601 with the local offset of that moment, e.g.
 * `2026-11-02T08:00:00-03:00`. Null when it is not a real date. A time skipped by a daylight saving change (in Chile,
 * 00:00–00:59 on the first Sunday of September) does not exist: it moves to the next valid hour, like a clock does.
 */
export function localInputToIso(value: string): string | null {
  const match = LOCAL_INPUT.exec(value);
  if (!match) return null;
  const [year, month, day, hours, minutes] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  const date = new Date(year, month - 1, day, hours, minutes);
  // new Date rolls invalid days over (Feb 30 → Mar 2); those are not dates the teacher meant.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  if (hours > 23 || minutes > 59) return null;

  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const absolute = Math.abs(offset);
  return `${toLocalInput(date)}:00${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

/** Fallback zone for the first render on the server, before the browser's zone is known (most teachers are in Chile). */
export const SERVER_TIME_ZONE = 'America/Santiago';

/** "2 de noviembre de 2026, 08:00" in Chilean format, in `timeZone` (the browser's when omitted). */
export function formatDateTime(iso: string, timeZone?: string): string {
  const zone = timeZone ? { timeZone } : {};
  const date = new Date(iso);
  // Date and time are formatted apart: the joiner of a combined format changes between ICU versions ("," / "a las").
  const day = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric', ...zone });
  const time = new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    ...zone,
  });
  return `${day.format(date)}, ${time.format(date)}`;
}
