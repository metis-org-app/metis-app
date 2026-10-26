import { parseProblem, type Problem } from '@/lib/api/problem';

/*
 * Spanish copy for metis-api errors on assessments, shared by server actions and the editor (which calls the /api
 * proxy from the browser). The API's own text is in English and written for developers: it is never shown.
 */
export const MESSAGES = {
  notFound: 'No encontramos esta evaluación. Puede que la hayan borrado o que no tengas acceso.',
  itemNotFound: 'Esta pregunta ya no existe. Recarga la página para ver la evaluación actual.',
  notDraft:
    'Esta evaluación ya no es un borrador, así que no se puede editar. Recarga la página; si necesitas cambiarla, duplícala.',
  conflict: 'Otra pestaña cambió esta evaluación al mismo tiempo. Recarga la página y vuelve a intentarlo.',
  invalid: 'Revisa los datos e inténtalo de nuevo.',
  unavailable: 'No pudimos conectar con Metis. Revisa tu conexión e inténtalo de nuevo en unos minutos.',
  rateLimited: 'Hubo demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.',
  publishFailed:
    'No pudimos publicarla. Revisa que tenga al menos una pregunta y recarga la página: puede que ya esté publicada.',
  alreadyArchived: 'Esta evaluación ya estaba archivada.',
  archivedButNotClosed:
    'Archivamos la evaluación, pero no pudimos cerrar todas sus asignaciones. Ciérralas desde la página de cada una.',
  deleteNotDraft: 'Solo se pueden eliminar borradores. Una evaluación publicada se archiva.',
  draftInvalid: 'Alguna pregunta del borrador no cumple el formato. Quítala o vuelve a generar el borrador.',
} as const;

/** Next to the field the API rejected. Only fields the editor shows; anything else becomes a general message. */
const FIELD_MESSAGES: Record<string, string> = {
  title: 'Revisa el título: es obligatorio y puede tener hasta 200 caracteres.',
  instructions: 'Las instrucciones pueden tener hasta 5000 caracteres.',
  prompt: 'Revisa el enunciado: es obligatorio y puede tener hasta 5000 caracteres.',
  points: 'Usa un puntaje entre 0,5 y 100, con hasta 2 decimales.',
  options:
    'Revisa las alternativas: entre 2 y 8, con texto, sin repetir, y las correctas que pide el tipo de pregunta.',
  isTrue: 'Indica si la afirmación es verdadera o falsa.',
  minWords: 'Revisa el rango de palabras: números entre 1 y 5000, con el mínimo menor o igual al máximo.',
  maxWords: 'Revisa el rango de palabras: números entre 1 y 5000, con el mínimo menor o igual al máximo.',
  teacherNotes: 'Las notas pueden tener hasta 5000 caracteres.',
  studentHint: 'La pista puede tener hasta 1000 caracteres.',
};

export type FieldErrors = Record<string, string>;

/** Field errors of a 400, keyed as the editor's fields (`minWords`/`maxWords` → `words`). */
export function fieldErrorsFromProblem(problem: Problem | undefined): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of Object.keys(problem?.errors ?? {})) {
    const message = FIELD_MESSAGES[field];
    if (message) errors[field === 'minWords' || field === 'maxWords' ? 'words' : field] = message;
  }
  return errors;
}

/** General message for a failed request, by status. A 400 without a known field means the assessment is locked. */
export function messageForStatus(status: number, notFound: string = MESSAGES.notFound): string {
  switch (status) {
    case 400:
      return MESSAGES.notDraft;
    case 404:
      return notFound;
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

export { parseProblem };
