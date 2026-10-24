import type { Availability } from './contract';

/*
 * Copy for an assignment's availability, which metis-api computes. The front never decides whether an assignment is
 * open: it only words what the API says, and picks the date worth showing next to it.
 */

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  Scheduled: 'Programada',
  Open: 'Abierta',
  Closed: 'Cerrada',
};

/** A sentence that may end in a date, rendered by the caller in the browser's zone. */
export type DatedText = { text: string; date?: string };

type Window = { availability: Availability; opensAt: string; dueAt: string | null };

/** What the teacher sees next to the status: "Abre el …", "Cierra el …", "Cerró el …". */
export function availabilityDetail({ availability, opensAt, dueAt }: Window, now = new Date()): DatedText {
  switch (availability) {
    case 'Scheduled':
      return { text: 'Abre el', date: opensAt };
    case 'Open':
      return dueAt ? { text: 'Cierra el', date: dueAt } : { text: 'Sin fecha de cierre' };
    case 'Closed':
      // Past its due date it closed by itself; otherwise the teacher closed it.
      return dueAt && new Date(dueAt) <= now
        ? { text: 'Cerró el', date: dueAt }
        : { text: 'Cerrada manualmente' };
  }
}

/** What a student sees on the link: "Disponible desde…", "Disponible hasta…" or "Esta evaluación ya cerró". */
export function publicAvailabilityText({ availability, opensAt, dueAt }: Window): DatedText {
  switch (availability) {
    case 'Scheduled':
      return { text: 'Disponible desde el', date: opensAt };
    case 'Open':
      return dueAt
        ? { text: 'Disponible hasta el', date: dueAt }
        : { text: 'Disponible ahora, sin fecha de cierre' };
    case 'Closed':
      return { text: 'Esta evaluación ya cerró' };
  }
}

export const durationLabel = (minutes: number) => (minutes === 1 ? '1 minuto' : `${minutes} minutos`);

export const itemCountLabel = (count: number) => (count === 1 ? '1 pregunta' : `${count} preguntas`);
