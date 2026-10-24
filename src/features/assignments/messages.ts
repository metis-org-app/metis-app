import 'server-only';
import { redirect } from 'next/navigation';
import { ApiError, ApiUnavailableError } from '@/lib/api/server';
import type { AssignmentField } from './schemas';

/*
 * Spanish copy for metis-api errors on assignments. Actions map status codes (and the field a 400 names) to these
 * messages and never show the API's own text, which is in English and written for developers.
 */
export const MESSAGES = {
  notFound: 'No encontramos esta asignación. Puede que la hayan eliminado o que no tengas acceso.',
  targetNotFound:
    'No encontramos la evaluación o el curso. Puede que los hayan eliminado o que no tengas acceso. Recarga la página.',
  conflict: 'Algo cambió al mismo tiempo en otra pestaña. Recarga la página y vuelve a intentarlo.',
  invalid: 'Revisa los datos e inténtalo de nuevo.',
  rateLimited: 'Hubo demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.',
  unavailable: 'No pudimos conectar con Metis. Revisa tu conexión e inténtalo de nuevo en unos minutos.',
  notOpenToReopen: 'Esta asignación ya está abierta. Recarga la página para ver su estado actual.',
} as const;

/** A 400 that names a field becomes this message next to that field. */
export const API_FIELD_MESSAGES: Record<AssignmentField, string> = {
  assessmentId: 'Solo se pueden asignar evaluaciones publicadas. Recarga la página para ver su estado.',
  workspaceId: 'Este curso está archivado. Restáuralo para asignarle evaluaciones.',
  opensAt: 'Revisa la fecha de apertura.',
  dueAt: 'El cierre tiene que ser una fecha futura y posterior a la apertura.',
  durationMinutes: 'La duración va de 5 a 240 minutos.',
  maxHelpLevel: 'Elige cuánto puede ayudar Metis.',
  assistantInstructions: 'Las indicaciones para Metis pueden tener hasta 2000 caracteres.',
};

/** The known fields a metis-api 400 names, with our copy. */
export function apiFieldErrors(error: ApiError): Partial<Record<AssignmentField, string[]>> {
  const errors: Partial<Record<AssignmentField, string[]>> = {};
  for (const field of Object.keys(error.problem?.errors ?? {})) {
    if (field in API_FIELD_MESSAGES) {
      const known = field as AssignmentField;
      errors[known] = [API_FIELD_MESSAGES[known]];
    }
  }
  return errors;
}

/**
 * Message for an error thrown by the metis-api client, or rethrows it when it is not an API error (a bug).
 * A 401 means the session expired: the user is sent to sign in again.
 */
export function messageFor(error: unknown, byStatus: Partial<Record<number, string>> = {}): string {
  if (error instanceof ApiUnavailableError) return MESSAGES.unavailable;
  if (!(error instanceof ApiError)) throw error;
  if (error.status === 401) redirect('/salir?motivo=expirada');
  if (byStatus[error.status]) return byStatus[error.status]!;
  switch (error.status) {
    case 404:
      return MESSAGES.notFound;
    case 409:
      return MESSAGES.conflict;
    case 429:
      return MESSAGES.rateLimited;
    case 502:
    case 503:
    case 504:
      return MESSAGES.unavailable;
    default:
      return MESSAGES.invalid;
  }
}
