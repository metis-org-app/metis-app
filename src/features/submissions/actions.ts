'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSessionToken } from '@/features/auth/server';
import { ApiError, ApiUnavailableError } from '@/lib/api/server';
import { publicSubmissionsApi, submissionsApi } from './api';
import { shareTokenSchema, submissionIdSchema } from './contract';
import { REVIEW_MESSAGES, START_MESSAGES, startErrorState } from './messages';
import { parseReview, startSchema, type ReviewFormState, type StartFormState } from './schemas';
import { setAccessKey } from './session';

/**
 * Starts the submission with the student's email. The access key metis-api returns goes straight into the httpOnly
 * cookie of this link, and the page reloads into the submission: the key never reaches the browser's JavaScript.
 */
export async function startSubmissionAction(
  rawShareToken: string,
  _previous: StartFormState,
  formData: FormData,
): Promise<StartFormState> {
  const email = typeof formData.get('email') === 'string' ? (formData.get('email') as string) : '';
  const values = { email };
  const shareToken = shareTokenSchema.safeParse(rawShareToken);
  if (!shareToken.success) return { values, message: START_MESSAGES.notFound };

  const parsed = startSchema.safeParse({ email });
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    const { accessKey } = await publicSubmissionsApi.start(shareToken.data, parsed.data.email);
    await setAccessKey(shareToken.data, accessKey);
  } catch (error) {
    if (error instanceof ApiUnavailableError) return { values, message: START_MESSAGES.unavailable };
    if (error instanceof ApiError) return { values, ...startErrorState(error.status, error.problem) };
    throw error;
  }

  redirect(`/rendir/${shareToken.data}`);
}

// The teacher's side.

async function teacherToken() {
  const value = await getSessionToken();
  if (!value) redirect('/salir?motivo=expirada');
  return value;
}

/** The assignment page (roster) and the submission page show the change. */
function refreshReview(assignmentId: string, submissionId: string) {
  revalidatePath(`/asignaciones/${assignmentId}`);
  revalidatePath(`/asignaciones/${assignmentId}/rendiciones/${submissionId}`);
}

function reviewMessage(error: unknown, on400: string): string {
  if (error instanceof ApiUnavailableError) return REVIEW_MESSAGES.unavailable;
  if (!(error instanceof ApiError)) throw error;
  switch (error.status) {
    case 400:
      return on400;
    case 401:
      redirect('/salir?motivo=expirada');
    case 404:
      return REVIEW_MESSAGES.notFound;
    case 409:
      return REVIEW_MESSAGES.conflict;
    case 429:
      return REVIEW_MESSAGES.rateLimited;
    default:
      return REVIEW_MESSAGES.unavailable;
  }
}

/** "Guardar revisión": the score (and optional comment) of one question. It also overrides an automatic score. */
export async function reviewItemAction(
  target: { assignmentId: string; submissionId: string; itemId: string; points: number; pointsText: string },
  _previous: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const text = (key: string) => (typeof formData.get(key) === 'string' ? (formData.get(key) as string) : '');
  const values = { score: text('score'), feedback: text('feedback') };
  const ids = [target.assignmentId, target.submissionId, target.itemId];
  if (!ids.every((id) => submissionIdSchema.safeParse(id).success)) {
    return { values, message: REVIEW_MESSAGES.notFound };
  }
  const parsed = parseReview(values, target.points, target.pointsText);
  if (!parsed.success) return { values, fieldErrors: parsed.fieldErrors };

  try {
    await submissionsApi.review(await teacherToken(), target.submissionId, target.itemId, parsed.data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      const fields = error.problem?.errors ?? {};
      if ('score' in fields)
        return { values, fieldErrors: { score: [`El puntaje va de 0 a ${target.pointsText}.`] } };
      if ('feedback' in fields)
        return { values, fieldErrors: { feedback: [`El comentario puede tener hasta 2000 caracteres.`] } };
    }
    return { values, message: reviewMessage(error, REVIEW_MESSAGES.inProgress) };
  }
  refreshReview(target.assignmentId, target.submissionId);
  return { ok: true, values };
}

/** "Permitir continuar en otro dispositivo": the next start with the student's email continues this submission. */
export async function allowResumeAction(
  assignmentId: string,
  submissionId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (![assignmentId, submissionId].every((id) => submissionIdSchema.safeParse(id).success)) {
    return { ok: false, message: REVIEW_MESSAGES.notFound };
  }
  try {
    await submissionsApi.allowResume(await teacherToken(), submissionId);
  } catch (error) {
    return { ok: false, message: reviewMessage(error, REVIEW_MESSAGES.notInProgress) };
  }
  refreshReview(assignmentId, submissionId);
  return { ok: true };
}
