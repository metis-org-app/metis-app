// Server-only entry of the assessments feature ("evaluaciones" in the UI): data for its pages.
import 'server-only';
import { redirect } from 'next/navigation';
import { getSessionToken } from '@/features/auth/server';
import { ApiError } from '@/lib/api/server';
import { assessmentsApi } from './api';
import { assessmentIdSchema, type AssessmentStatus } from './contract';

export type { Assessment, AssessmentStatus, AssessmentSummary, StudentAssessment } from './contract';

async function token() {
  const value = await getSessionToken();
  if (!value) redirect('/salir?motivo=expirada');
  return value;
}

export async function getAssessments(status: AssessmentStatus) {
  return assessmentsApi.list(await token(), status);
}

/** Null when it does not exist or belongs to another teacher (both are 404), so the page shows "not found". */
async function orNull<T>(id: string, load: (token: string, id: string) => Promise<T>) {
  if (!assessmentIdSchema.safeParse(id).success) return null;
  try {
    return await load(await token(), id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export const getAssessment = (id: string) => orNull(id, assessmentsApi.get);

export const getAssessmentPreview = (id: string) => orNull(id, assessmentsApi.preview);
