import 'server-only';
import { redirect } from 'next/navigation';
import { ApiError, ApiUnavailableError } from '@/lib/api/server';

/*
 * Spanish copy for metis-api errors. Actions map status codes to these messages and never show the API's own text,
 * which is in English and written for developers.
 */
export const MESSAGES = {
  notFound: 'No encontramos este curso. Puede que lo hayan borrado o que no tengas acceso.',
  studentNotFound: 'Ese estudiante ya no está en el curso. Recarga la página para ver la nómina actual.',
  duplicateEmail: 'Ya hay un estudiante con este email en el curso.',
  rateLimited: 'Hubo demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.',
  unavailable: 'No pudimos conectar con Metis. Revisa tu conexión e inténtalo de nuevo en unos minutos.',
  invalid: 'Revisa los datos e inténtalo de nuevo.',
  archived: 'Este curso está archivado. Restáuralo para hacer cambios en la nómina.',
} as const;

/**
 * Message for an error thrown by the metis-api client, or rethrows it when it is not an API error (a bug).
 * A 401 means the session expired: the user is sent to sign in again.
 */
export function messageFor(error: unknown, notFound: string = MESSAGES.notFound): string {
  if (error instanceof ApiUnavailableError) return MESSAGES.unavailable;
  if (!(error instanceof ApiError)) throw error;
  switch (error.status) {
    case 401:
      redirect('/salir?motivo=expirada');
    case 404:
      return notFound;
    case 409:
      return MESSAGES.duplicateEmail;
    case 429:
      return MESSAGES.rateLimited;
    default:
      return MESSAGES.invalid;
  }
}
