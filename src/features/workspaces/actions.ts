'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSessionToken } from '@/features/auth/server';
import { ApiError } from '@/lib/api/server';
import { joinApi, joinCodeParamSchema, workspaceIdSchema, workspacesApi } from './api';
import { MESSAGES, messageFor } from './messages';
import {
  joinSchema,
  rosterSchema,
  studentSchema,
  workspaceNameSchema,
  type ActionResult,
  type FormState,
  type JoinFormState,
  type RegenerateResult,
  type RosterResult,
  type StudentInput,
} from './schemas';

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

async function token() {
  const value = await getSessionToken();
  if (!value) redirect('/salir?motivo=expirada');
  return value;
}

/** Ids arrive from the client: only UUIDs may reach an upstream path. */
function validId(...ids: string[]) {
  return ids.every((id) => workspaceIdSchema.safeParse(id).success);
}

function refresh(workspaceId?: string) {
  revalidatePath('/cursos');
  revalidatePath('/cursos/archivados');
  if (workspaceId) revalidatePath(`/cursos/${workspaceId}`);
}

export async function createWorkspaceAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = { name: text(formData, 'name') };
  const parsed = workspaceNameSchema.safeParse(values);
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  let id: string;
  try {
    id = (await workspacesApi.create(await token(), parsed.data.name)).id;
  } catch (error) {
    return { values, message: messageFor(error) };
  }

  refresh();
  redirect(`/cursos/${id}`);
}

export async function renameWorkspaceAction(
  workspaceId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = { name: text(formData, 'name') };
  if (!validId(workspaceId)) return { values, message: MESSAGES.notFound };
  const parsed = workspaceNameSchema.safeParse(values);
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    await workspacesApi.rename(await token(), workspaceId, parsed.data.name);
  } catch (error) {
    return { values, message: messageFor(error) };
  }

  refresh(workspaceId);
  return { ok: true };
}

export async function archiveWorkspaceAction(workspaceId: string): Promise<ActionResult> {
  return changeStatus(workspaceId, 'archive');
}

export async function restoreWorkspaceAction(workspaceId: string): Promise<ActionResult> {
  return changeStatus(workspaceId, 'restore');
}

async function changeStatus(workspaceId: string, change: 'archive' | 'restore'): Promise<ActionResult> {
  if (!validId(workspaceId)) return { ok: false, message: MESSAGES.notFound };
  try {
    await workspacesApi[change](await token(), workspaceId);
  } catch (error) {
    // 400: it was already archived/restored (e.g. from another tab). Reloading shows the current state.
    if (error instanceof ApiError && error.status === 400) {
      refresh(workspaceId);
      return { ok: true };
    }
    return { ok: false, message: messageFor(error) };
  }
  refresh(workspaceId);
  return { ok: true };
}

export async function regenerateJoinCodeAction(workspaceId: string): Promise<RegenerateResult> {
  if (!validId(workspaceId)) return { ok: false, message: MESSAGES.notFound };
  try {
    const { joinCode } = await workspacesApi.regenerateJoinCode(await token(), workspaceId);
    refresh(workspaceId);
    return { ok: true, joinCode };
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
}

export async function addStudentAction(
  workspaceId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = { name: text(formData, 'name'), email: text(formData, 'email') };
  if (!validId(workspaceId)) return { values, message: MESSAGES.notFound };
  const parsed = studentSchema.safeParse(values);
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    await workspacesApi.addStudent(await token(), workspaceId, parsed.data);
  } catch (error) {
    return studentError(error, values);
  }

  refresh(workspaceId);
  return { ok: true, message: `Agregaste a ${parsed.data.name}.` };
}

export async function updateStudentAction(
  workspaceId: string,
  studentId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = { name: text(formData, 'name'), email: text(formData, 'email') };
  if (!validId(workspaceId, studentId)) return { values, message: MESSAGES.studentNotFound };
  const parsed = studentSchema.safeParse(values);
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    await workspacesApi.updateStudent(await token(), workspaceId, studentId, parsed.data);
  } catch (error) {
    return studentError(error, values, MESSAGES.studentNotFound);
  }

  refresh(workspaceId);
  return { ok: true };
}

function studentError(error: unknown, values: FormState['values'], notFound?: string): FormState {
  if (error instanceof ApiError && error.status === 409) {
    return { values, fieldErrors: { email: [MESSAGES.duplicateEmail] } };
  }
  // The only rule metis-api adds over our own validation: an archived course does not accept students.
  if (error instanceof ApiError && error.status === 400) return { values, message: MESSAGES.archived };
  return { values, message: messageFor(error, notFound) };
}

export async function removeStudentAction(workspaceId: string, studentId: string): Promise<ActionResult> {
  if (!validId(workspaceId, studentId)) return { ok: false, message: MESSAGES.studentNotFound };
  try {
    await workspacesApi.removeStudent(await token(), workspaceId, studentId);
  } catch (error) {
    // Already removed (another tab): the goal is met.
    if (!(error instanceof ApiError && error.status === 404)) {
      return { ok: false, message: messageFor(error) };
    }
  }
  refresh(workspaceId);
  return { ok: true };
}

export async function addRosterAction(workspaceId: string, students: StudentInput[]): Promise<RosterResult> {
  if (!validId(workspaceId)) return { ok: false, message: MESSAGES.notFound };
  // The client already parsed the list; it is validated again here because actions are public endpoints.
  const parsed = rosterSchema.safeParse(students);
  if (!parsed.success) return { ok: false, message: MESSAGES.invalid };

  try {
    const result = await workspacesApi.addRoster(await token(), workspaceId, parsed.data);
    refresh(workspaceId);
    return { ok: true, added: result.added.length, alreadyEnrolled: result.alreadyEnrolled };
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) return { ok: false, message: MESSAGES.invalid };
    return { ok: false, message: messageFor(error) };
  }
}

export async function joinWorkspaceAction(
  rawCode: string,
  _previous: JoinFormState,
  formData: FormData,
): Promise<JoinFormState> {
  const values = { name: text(formData, 'name'), email: text(formData, 'email') };
  const code = joinCodeParamSchema.safeParse(rawCode);
  if (!code.success) return { values, message: JOIN_NOT_FOUND };
  const parsed = joinSchema.safeParse(values);
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    const { workspaceName } = await joinApi.join(code.data, parsed.data);
    return { ok: true, workspaceName };
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) return { values, message: JOIN_INVALID };
    return { values, message: messageFor(error, JOIN_NOT_FOUND) };
  }
}

const JOIN_NOT_FOUND =
  'Este código ya no funciona. Puede que tu profe lo haya cambiado o que el curso esté cerrado. Pídele el link nuevo.';
const JOIN_INVALID = 'Revisa tu nombre y tu email e inténtalo de nuevo.';
