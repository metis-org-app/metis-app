import {
  AVAILABILITY_LABELS,
  availabilityDetail,
  durationLabel,
  publicAvailabilityText,
} from './availability';

const opensAt = '2026-11-02T11:00:00+00:00';
const dueAt = '2026-11-02T13:00:00+00:00';

describe('availability labels', () => {
  it('names the three states in Spanish', () => {
    expect(AVAILABILITY_LABELS).toEqual({ Scheduled: 'Programada', Open: 'Abierta', Closed: 'Cerrada' });
  });

  it('shows the teacher the date that matters for each state', () => {
    expect(availabilityDetail({ availability: 'Scheduled', opensAt, dueAt })).toEqual({
      text: 'Abre el',
      date: opensAt,
    });
    expect(availabilityDetail({ availability: 'Open', opensAt, dueAt })).toEqual({
      text: 'Cierra el',
      date: dueAt,
    });
    expect(availabilityDetail({ availability: 'Open', opensAt, dueAt: null })).toEqual({
      text: 'Sin fecha de cierre',
    });
  });

  it('tells a close by due date from a close by hand', () => {
    const after = new Date('2026-11-03T00:00:00Z');
    const before = new Date('2026-11-02T12:00:00Z');
    expect(availabilityDetail({ availability: 'Closed', opensAt, dueAt }, after)).toEqual({
      text: 'Cerró el',
      date: dueAt,
    });
    expect(availabilityDetail({ availability: 'Closed', opensAt, dueAt }, before)).toEqual({
      text: 'Cerrada manualmente',
    });
    expect(availabilityDetail({ availability: 'Closed', opensAt, dueAt: null }, after)).toEqual({
      text: 'Cerrada manualmente',
    });
  });

  it('tells the student when they can answer', () => {
    expect(publicAvailabilityText({ availability: 'Scheduled', opensAt, dueAt })).toEqual({
      text: 'Disponible desde el',
      date: opensAt,
    });
    expect(publicAvailabilityText({ availability: 'Open', opensAt, dueAt })).toEqual({
      text: 'Disponible hasta el',
      date: dueAt,
    });
    expect(publicAvailabilityText({ availability: 'Open', opensAt, dueAt: null })).toEqual({
      text: 'Disponible ahora, sin fecha de cierre',
    });
    expect(publicAvailabilityText({ availability: 'Closed', opensAt, dueAt })).toEqual({
      text: 'Esta evaluación ya cerró',
    });
  });

  it('words durations', () => {
    expect(durationLabel(45)).toBe('45 minutos');
    expect(durationLabel(1)).toBe('1 minuto');
  });
});
