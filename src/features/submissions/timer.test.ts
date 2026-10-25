import { clockOffset, formatRemaining, remainingInWords, remainingMs, timeWarning } from './timer';

describe('timer', () => {
  it('measures the time left with the server clock, not the device clock', () => {
    // The phone is 3 minutes behind: the server said 12:00:00 while the phone read 11:57:00.
    const deviceNow = Date.parse('2026-10-24T11:57:00Z');
    const offset = clockOffset('2026-10-24T12:00:00Z', deviceNow - 200, deviceNow + 200);
    expect(offset).toBe(3 * 60_000);

    // The deadline is 12:10 server time: 10 minutes left, although the phone's clock says 13.
    expect(remainingMs('2026-10-24T12:10:00Z', offset, deviceNow)).toBe(10 * 60_000);
  });

  it('never goes below zero once the deadline passed', () => {
    expect(remainingMs('2026-10-24T12:00:00Z', 0, Date.parse('2026-10-24T12:00:05Z'))).toBe(0);
  });

  it('formats minutes and seconds, with hours only when needed, rounding up', () => {
    expect(formatRemaining(12 * 60_000 + 5_000)).toBe('12:05');
    expect(formatRemaining(62 * 60_000)).toBe('1:02:00');
    expect(formatRemaining(400)).toBe('0:01');
    expect(formatRemaining(0)).toBe('0:00');
  });

  it('words the time left for screen readers', () => {
    expect(remainingInWords(10 * 60_000)).toBe('Quedan 10 minutos');
    expect(remainingInWords(30_000)).toBe('Queda menos de 1 minuto');
    expect(remainingInWords(0)).toBe('Se acabó el tiempo');
  });

  it('changes the announced warning only when the time left crosses 5 minutes and 1 minute', () => {
    expect(timeWarning(5 * 60_000 + 500)).toBe('');
    expect(timeWarning(5 * 60_000 - 500)).toBe('Quedan menos de 5 minutos.');
    expect(timeWarning(4 * 60_000)).toBe('Quedan menos de 5 minutos.'); // same text: nothing new to announce
    expect(timeWarning(59_500)).toBe('Queda menos de 1 minuto.');
    expect(timeWarning(0)).toBe('Se acabó el tiempo.');
  });
});
