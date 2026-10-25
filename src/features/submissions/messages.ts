import type { Problem } from '@/lib/api/problem';
import type { StartFormState } from './schemas';

/*
 * Spanish copy for metis-api errors of the student flow. The API distinguishes the cases with the status, the field a
 * 400 names and the `code` of its 409s; its own text (in English, for developers) is never shown.
 */
export const START_MESSAGES = {
  notOnRoster: 'Tu email no está en la nómina de este curso. Pídele a tu profesor que te agregue.',
  alreadyStarted:
    'Ya empezaste esta evaluación en otro dispositivo. Si necesitas continuar aquí, pídele a tu profesor que lo permita.',
  alreadySubmitted: 'Ya entregaste esta evaluación.',
  invalidEmail: 'Revisa tu email: parece que le falta algo o tiene un error.',
  notOpen:
    'Esta evaluación no está disponible en este momento. Vuelve a cargar la página para ver su estado.',
  notFound: 'No encontramos esta evaluación. Puede que tu profesor haya cambiado el link: pídele el nuevo.',
  rateLimited:
    'Hubo demasiados intentos seguidos desde esta conexión. Espera un minuto y vuelve a intentarlo.',
  unavailable: 'No pudimos conectar con Metis. Revisa tu conexión e inténtalo de nuevo.',
  unexpected: 'No pudimos empezar la evaluación. Inténtalo de nuevo en un momento.',
} as const;

/** The form state for a failed start, from the status and Problem Details of metis-api. */
export function startErrorState(status: number, problem: Problem | undefined): StartFormState {
  switch (status) {
    case 400:
      return problem?.errors?.email
        ? { fieldErrors: { email: [START_MESSAGES.invalidEmail] } }
        : { message: START_MESSAGES.notOpen };
    case 403:
      return { fieldErrors: { email: [START_MESSAGES.notOnRoster] } };
    case 404:
      return { message: START_MESSAGES.notFound };
    case 409:
      // Without a code it is two first starts racing each other: the other one won.
      return {
        message:
          problem?.code === 'alreadySubmitted'
            ? START_MESSAGES.alreadySubmitted
            : START_MESSAGES.alreadyStarted,
      };
    case 429:
      return { message: START_MESSAGES.rateLimited };
    case 502:
    case 503:
    case 504:
      return { message: START_MESSAGES.unavailable };
    default:
      return { message: START_MESSAGES.unexpected };
  }
}
