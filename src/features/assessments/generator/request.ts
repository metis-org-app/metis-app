import { parseProblem } from '@/lib/api/problem';
import { assessmentDraftSchema, type AssessmentDraft } from '../contract';
import { MESSAGES } from '../errors';
import type { GeneratorFieldErrors } from './values';

/*
 * POST /api/assessments/generate from the browser, through the /api proxy: it sends FormData (the browser streams the
 * files) and can be cancelled with an AbortSignal, which a server action cannot. Failures come back as Spanish messages.
 */

export type GenerateFailure = {
  ok: false;
  /** The teacher cancelled: not an error to show. */
  aborted?: true;
  message: string;
  fieldErrors: GeneratorFieldErrors;
  /** The file metis-api rejected (413, 415), to point at it in the list. */
  fileName?: string;
};

export type GenerateResult = { ok: true; draft: AssessmentDraft } | GenerateFailure;

export type GenerateDraft = (formData: FormData, signal: AbortSignal) => Promise<GenerateResult>;

export const GENERATE_MESSAGES = {
  tooLarge: (fileName: string) =>
    `«${fileName}» es demasiado pesado para que Metis lo lea. Cada archivo puede pesar hasta 15 MB y las imágenes hasta 5 MB; un PDF escaneado muy grande tampoco se puede leer. Quítalo o súbelo más liviano.`,
  materialsTooLarge: 'Los materiales son demasiado extensos. Quita algún archivo o acorta el texto pegado.',
  unsupported: (fileName: string) =>
    `No pudimos leer «${fileName}». Revisa que sea PDF, una imagen, Word, PowerPoint, Excel, OpenDocument, RTF o texto, y que no esté dañado ni protegido con contraseña.`,
  rateLimited: 'Alcanzaste el límite de borradores por hora. Intenta más tarde.',
  failed: 'Metis no pudo generar el borrador. Intenta de nuevo o cambia los materiales.',
  network:
    'Se cortó la conexión mientras Metis preparaba el borrador. Revisa tu conexión e inténtalo de nuevo.',
  cancelled: 'Cancelaste la generación. Tus datos siguen aquí.',
} as const;

/** Next to the fields of the form, for a 400 that names them. */
const FIELD_MESSAGES: Partial<Record<string, string>> = {
  topic: 'Revisa el tema: es obligatorio y puede tener hasta 300 caracteres.',
  level: 'El nivel o curso puede tener hasta 100 caracteres.',
  itemCount: 'Pide entre 1 y 30 preguntas.',
  allowedTypes: 'Elige al menos un tipo de pregunta.',
  instructions: 'Las indicaciones pueden tener hasta 2000 caracteres.',
  sourceText: 'El texto pegado puede tener hasta 50.000 caracteres.',
  files: 'Puedes subir hasta 5 archivos.',
};

const cancelled = (): GenerateFailure => ({
  ok: false,
  aborted: true,
  message: GENERATE_MESSAGES.cancelled,
  fieldErrors: {},
});

const fileNameOf = (payload: unknown) =>
  payload && typeof payload === 'object' && 'fileName' in payload && typeof payload.fileName === 'string'
    ? payload.fileName
    : undefined;

export const requestDraft: GenerateDraft = async (formData, signal) => {
  let response: Response;
  try {
    response = await fetch('/api/assessments/generate', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData,
      signal,
    });
  } catch {
    return signal.aborted ? cancelled() : { ok: false, message: GENERATE_MESSAGES.network, fieldErrors: {} };
  }

  if (response.status === 401) {
    // Same as the editor: the session expired, so a full navigation to /salir clears it.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/salir?motivo=expirada');
    return { ok: false, message: MESSAGES.unavailable, fieldErrors: {} };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (signal.aborted) return cancelled();
    payload = undefined;
  }

  if (response.ok) {
    const parsed = assessmentDraftSchema.safeParse(payload);
    return parsed.success
      ? { ok: true, draft: parsed.data }
      : { ok: false, message: GENERATE_MESSAGES.failed, fieldErrors: {} };
  }

  return failureFor(response.status, payload);
};

/** The Spanish failure for an error status of metis-api (or of the proxy, which answers 502 when it cannot reach it). */
export function failureFor(status: number, payload: unknown): GenerateFailure {
  const fileName = fileNameOf(payload);

  switch (status) {
    case 400: {
      const fieldErrors: GeneratorFieldErrors = {};
      for (const field of Object.keys(parseProblem(payload)?.errors ?? {})) {
        const message = FIELD_MESSAGES[field];
        if (message) fieldErrors[field as keyof GeneratorFieldErrors] = message;
      }
      return { ok: false, message: MESSAGES.invalid, fieldErrors };
    }
    case 413:
      return fileName
        ? { ok: false, message: GENERATE_MESSAGES.tooLarge(fileName), fieldErrors: {}, fileName }
        : { ok: false, message: GENERATE_MESSAGES.materialsTooLarge, fieldErrors: {} };
    case 415:
      return {
        ok: false,
        message: GENERATE_MESSAGES.unsupported(fileName ?? 'uno de los archivos'),
        fieldErrors: {},
        ...(fileName ? { fileName } : {}),
      };
    case 429:
      return { ok: false, message: GENERATE_MESSAGES.rateLimited, fieldErrors: {} };
    default:
      // 502 (the AI failed, or the proxy could not reach metis-api in time) and anything unexpected.
      return { ok: false, message: GENERATE_MESSAGES.failed, fieldErrors: {} };
  }
}
