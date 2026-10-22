'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSessionToken } from '@/features/auth/server';
import { ApiError, ApiUnavailableError } from '@/lib/api/server';
import { assessmentsApi } from './api';
import { assessmentIdSchema } from './contract';
import { MESSAGES, messageForStatus } from './errors';
import { createAssessmentSchema, type ActionResult, type FormState } from './schemas';

/*
 * Mutations that change which page the teacher is on (create, publish, archive, duplicate, delete). Edits inside the
 * editor are autosaved from the browser through the /api proxy instead (see client-api.ts).
 */

async function token() {
  const value = await getSessionToken();
  if (!value) redirect('/salir?motivo=expirada');
  return value;
}

/** Spanish message for an error of the metis-api client; anything else is a bug and is rethrown. */
function messageFor(error: unknown, byStatus: Partial<Record<number, string>> = {}): string {
  if (error instanceof ApiUnavailableError) return MESSAGES.unavailable;
  if (!(error instanceof ApiError)) throw error;
  if (error.status === 401) redirect('/salir?motivo=expirada');
  return byStatus[error.status] ?? messageForStatus(error.status);
}

function refresh(id?: string) {
  revalidatePath('/evaluaciones');
  if (id) revalidatePath(`/evaluaciones/${id}`);
}

export async function createAssessmentAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const raw = formData.get('title');
  const values = { title: typeof raw === 'string' ? raw : '' };
  const parsed = createAssessmentSchema.safeParse(values);
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  let id: string;
  try {
    id = (await assessmentsApi.create(await token(), parsed.data.title)).id;
  } catch (error) {
    return { values, message: messageFor(error, { 400: MESSAGES.invalid }) };
  }

  refresh();
  redirect(`/evaluaciones/${id}`);
}

export async function publishAssessmentAction(id: string): Promise<ActionResult> {
  return run(id, (sessionToken) => assessmentsApi.publish(sessionToken, id), { 400: MESSAGES.publishFailed });
}

export async function archiveAssessmentAction(id: string): Promise<ActionResult> {
  return run(id, (sessionToken) => assessmentsApi.archive(sessionToken, id), {
    400: MESSAGES.alreadyArchived,
  });
}

export async function deleteAssessmentAction(id: string): Promise<ActionResult> {
  const result = await run(id, (sessionToken) => assessmentsApi.remove(sessionToken, id), {
    400: MESSAGES.deleteNotDraft,
  });
  if (result.ok) redirect('/evaluaciones');
  return result;
}

/** On success, opens the new draft in the editor. */
export async function duplicateAssessmentAction(id: string): Promise<ActionResult> {
  if (!assessmentIdSchema.safeParse(id).success) return { ok: false, message: MESSAGES.notFound };
  let copyId: string;
  try {
    copyId = (await assessmentsApi.duplicate(await token(), id)).id;
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
  refresh();
  redirect(`/evaluaciones/${copyId}`);
}

async function run(
  id: string,
  call: (sessionToken: string) => Promise<unknown>,
  byStatus: Partial<Record<number, string>>,
): Promise<ActionResult> {
  // Ids arrive from the client: only UUIDs may reach an upstream path.
  if (!assessmentIdSchema.safeParse(id).success) return { ok: false, message: MESSAGES.notFound };
  try {
    await call(await token());
  } catch (error) {
    return { ok: false, message: messageFor(error, byStatus) };
  }
  refresh(id);
  return { ok: true };
}
