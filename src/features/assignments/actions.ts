'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSessionToken } from '@/features/auth/server';
import { ApiError } from '@/lib/api/server';
import { assignmentsApi } from './api';
import { assignmentIdSchema } from './contract';
import { apiFieldErrors, API_FIELD_MESSAGES, MESSAGES, messageFor } from './messages';
import {
  FIELD_COPY,
  parseSettings,
  parseTarget,
  readAssignmentForm,
  type ActionResult,
  type AssignmentFormState,
} from './schemas';

async function token() {
  const value = await getSessionToken();
  if (!value) redirect('/salir?motivo=expirada');
  return value;
}

/** Ids arrive from the client: only UUIDs may reach an upstream path. */
const validId = (id: string) => assignmentIdSchema.safeParse(id).success;

// An assignment shows up on its own page, its course and its assessment.
function refresh(assignment?: { id: string; workspaceId: string; assessmentId: string }) {
  if (!assignment) return;
  revalidatePath(`/asignaciones/${assignment.id}`);
  revalidatePath(`/cursos/${assignment.workspaceId}`);
  revalidatePath(`/evaluaciones/${assignment.assessmentId}`);
}

/** "Asignar": from an assessment (the course comes from the form) or from a course (the assessment does). */
export async function createAssignmentAction(
  _previous: AssignmentFormState,
  formData: FormData,
): Promise<AssignmentFormState> {
  const values = readAssignmentForm(formData);
  const target = parseTarget(values);
  const settings = parseSettings(values, { now: new Date() });
  if (!target.success || !settings.success) {
    return {
      values,
      fieldErrors: {
        ...(target.success ? {} : target.fieldErrors),
        ...(settings.success ? {} : settings.fieldErrors),
      },
    };
  }

  let id: string;
  try {
    const created = await assignmentsApi.create(await token(), {
      ...target.data,
      ...settings.data,
      resultsVisible: values.resultsVisible ?? false,
    });
    refresh(created);
    id = created.id;
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      const fieldErrors = apiFieldErrors(error);
      return Object.keys(fieldErrors).length > 0
        ? { values, fieldErrors }
        : { values, message: MESSAGES.invalid };
    }
    return { values, message: messageFor(error, { 404: MESSAGES.targetNotFound }) };
  }

  redirect(`/asignaciones/${id}`);
}

/**
 * "Guardar cambios" of the configuration. The current close date may stay even if it already passed. With
 * submissions, only the close date changes: the other fields are sent exactly as metis-api has them (the form shows
 * them disabled), and the close date can only be extended.
 */
export async function updateAssignmentAction(
  id: string,
  _previous: AssignmentFormState,
  formData: FormData,
): Promise<AssignmentFormState> {
  const values = readAssignmentForm(formData);
  if (!validId(id)) return { values, message: MESSAGES.notFound };

  let current;
  try {
    current = await assignmentsApi.get(await token(), id);
  } catch (error) {
    return { values, message: messageFor(error) };
  }
  const locked = current.submissionCount > 0;
  const effective = locked
    ? {
        ...values,
        opensMode: 'at' as const,
        opensAt: current.opensAt,
        durationMinutes: String(current.durationMinutes),
        assistantEnabled: current.assistantEnabled,
        maxHelpLevel: String(current.maxHelpLevel),
        assistantInstructions: current.assistantInstructions ?? '',
      }
    : values;
  // "Ahora" while editing means this moment; an omitted opensAt would keep the current one in metis-api.
  const settings = parseSettings(effective, {
    now: new Date(),
    currentDueAt: current.dueAt,
    extendOnly: locked,
  });
  if (!settings.success) return { values, fieldErrors: settings.fieldErrors };

  try {
    const updated = await assignmentsApi.update(await token(), id, {
      ...settings.data,
      opensAt: settings.data.opensAt ?? new Date().toISOString(),
    });
    refresh(updated);
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      const fieldErrors = apiFieldErrors(error);
      // A submission arrived after the page loaded: the fields it locks are now rejected.
      if (!locked && Object.keys(fieldErrors).some((field) => field !== 'dueAt')) {
        return { values, message: MESSAGES.locked };
      }
      if (locked && fieldErrors.dueAt) return { values, fieldErrors: { dueAt: [FIELD_COPY.dueExtendOnly] } };
      return Object.keys(fieldErrors).length > 0
        ? { values, fieldErrors }
        : { values, message: MESSAGES.invalid };
    }
    return { values, message: messageFor(error) };
  }
  return { ok: true };
}

export async function closeAssignmentAction(id: string): Promise<ActionResult> {
  return run(id, (sessionToken) => assignmentsApi.close(sessionToken, id), {
    // Already closed (another tab, or its due date just passed): the goal is met; the page shows the current state.
    alreadyDone: 400,
  });
}

/** `dueAt`: a new close date in ISO with offset, or null to keep a future one (a past one is cleared). */
export async function reopenAssignmentAction(id: string, dueAt: string | null): Promise<ActionResult> {
  if (
    dueAt !== null &&
    (!z.iso.datetime({ offset: true }).safeParse(dueAt).success || new Date(dueAt) <= new Date())
  ) {
    return { ok: false, message: FIELD_COPY.dueInFuture, fieldError: FIELD_COPY.dueInFuture };
  }
  return run(id, (sessionToken) => assignmentsApi.reopen(sessionToken, id, dueAt), {
    on400: (error) =>
      error.problem?.errors?.dueAt
        ? { ok: false, message: API_FIELD_MESSAGES.dueAt, fieldError: API_FIELD_MESSAGES.dueAt }
        : { ok: false, message: MESSAGES.notOpenToReopen },
  });
}

export async function setResultsVisibilityAction(id: string, visible: boolean): Promise<ActionResult> {
  return run(id, (sessionToken) => assignmentsApi.setResultsVisibility(sessionToken, id, visible));
}

export async function regenerateShareTokenAction(id: string): Promise<ActionResult> {
  return run(id, async (sessionToken) => {
    await assignmentsApi.regenerateShareToken(sessionToken, id);
    return assignmentsApi.get(sessionToken, id);
  });
}

/** On success, goes back to the course of the assignment. */
export async function deleteAssignmentAction(id: string): Promise<ActionResult> {
  if (!validId(id)) return { ok: false, message: MESSAGES.notFound };
  let workspaceId: string;
  try {
    const sessionToken = await token();
    const assignment = await assignmentsApi.get(sessionToken, id);
    await assignmentsApi.remove(sessionToken, id);
    refresh(assignment);
    workspaceId = assignment.workspaceId;
  } catch (error) {
    return { ok: false, message: messageFor(error) };
  }
  redirect(`/cursos/${workspaceId}`);
}

type RunOptions = {
  /** A status that means the change was already made. */
  alreadyDone?: number;
  on400?: (error: ApiError) => ActionResult;
};

async function run(
  id: string,
  call: (sessionToken: string) => Promise<{ id: string; workspaceId: string; assessmentId: string }>,
  { alreadyDone, on400 }: RunOptions = {},
): Promise<ActionResult> {
  if (!validId(id)) return { ok: false, message: MESSAGES.notFound };
  try {
    refresh(await call(await token()));
  } catch (error) {
    if (error instanceof ApiError && error.status === alreadyDone) {
      revalidatePath(`/asignaciones/${id}`);
      return { ok: true };
    }
    if (error instanceof ApiError && error.status === 400 && on400) return on400(error);
    return { ok: false, message: messageFor(error) };
  }
  return { ok: true };
}
