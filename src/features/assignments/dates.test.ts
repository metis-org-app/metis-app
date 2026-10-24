import { formatDateTime, isoToLocalInput, localInputToIso } from './dates';

// The conversion uses the runtime's zone, as the browser does. Node reads TZ again when it changes.
const originalTimeZone = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'America/Santiago';
});
afterAll(() => {
  process.env.TZ = originalTimeZone;
});

describe('localInputToIso', () => {
  it('adds the offset of that moment in Chile, on each side of the September change (-04:00 → -03:00)', () => {
    // 2026: clocks go from 00:00 to 01:00 on Sunday, September 6.
    expect(localInputToIso('2026-09-05T23:30')).toBe('2026-09-05T23:30:00-04:00');
    expect(localInputToIso('2026-09-06T08:00')).toBe('2026-09-06T08:00:00-03:00');
  });

  it('adds the offset of that moment in Chile, on each side of the April change (-03:00 → -04:00)', () => {
    // 2027: clocks go back from 00:00 to 23:00 on Saturday, April 3.
    expect(localInputToIso('2027-04-03T12:00')).toBe('2027-04-03T12:00:00-03:00');
    expect(localInputToIso('2027-04-04T12:00')).toBe('2027-04-04T12:00:00-04:00');
  });

  it('keeps the same instant across the change: 8:00 on both sides is a different UTC hour', () => {
    expect(new Date(localInputToIso('2026-09-05T08:00')!).toISOString()).toBe('2026-09-05T12:00:00.000Z');
    expect(new Date(localInputToIso('2026-09-07T08:00')!).toISOString()).toBe('2026-09-07T11:00:00.000Z');
  });

  it('moves a time skipped by the change to the next valid hour', () => {
    expect(localInputToIso('2026-09-06T00:30')).toBe('2026-09-06T01:30:00-03:00');
  });

  it('rejects values that are not real dates', () => {
    expect(localInputToIso('')).toBeNull();
    expect(localInputToIso('2026-02-30T10:00')).toBeNull();
    expect(localInputToIso('2026-11-02 08:00')).toBeNull();
    expect(localInputToIso('2026-11-02T24:00')).toBeNull();
  });
});

describe('isoToLocalInput', () => {
  it('shows an API date (UTC) in the local zone, as a datetime-local value', () => {
    expect(isoToLocalInput('2026-11-02T11:00:00+00:00')).toBe('2026-11-02T08:00');
    expect(isoToLocalInput('2026-07-01T12:00:00.1234567+00:00')).toBe('2026-07-01T08:00');
  });

  it('round-trips with localInputToIso', () => {
    expect(isoToLocalInput(localInputToIso('2027-04-03T23:15')!)).toBe('2027-04-03T23:15');
  });
});

describe('formatDateTime', () => {
  it('uses the Chilean format and the given zone', () => {
    expect(formatDateTime('2026-11-02T11:00:00Z', 'America/Santiago')).toBe('2 de noviembre de 2026, 08:00');
    expect(formatDateTime('2026-11-02T11:00:00Z', 'Europe/Madrid')).toBe('2 de noviembre de 2026, 12:00');
  });

  it("uses the runtime's zone when none is given", () => {
    expect(formatDateTime('2026-07-01T12:00:00Z')).toBe('1 de julio de 2026, 08:00');
  });
});
