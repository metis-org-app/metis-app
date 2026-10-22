import { formatPoints } from './item-draft';

// Dates are shown in Chile's time zone wherever they render (server or browser), so both agree.
const dateFormat = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Santiago',
});

export const formatDate = (iso: string) => dateFormat.format(new Date(iso));

export const itemCountLabel = (count: number) => (count === 1 ? '1 pregunta' : `${count} preguntas`);

export const pointsLabel = (points: number) => (points === 1 ? '1 punto' : `${formatPoints(points)} puntos`);
