// Server-only entry of the assignments feature ("asignaciones" in the UI): data for its pages and the student link.
import 'server-only';
import { redirect } from 'next/navigation';
import { getSessionToken } from '@/features/auth/server';
import { ApiError, ApiUnavailableError } from '@/lib/api/server';
import { env } from '@/lib/env';
import { assignmentsApi, publicAssignmentsApi, type AssignmentFilter } from './api';
import { assignmentIdSchema, shareTokenParamSchema, type PublicAssignment } from './contract';

export type { Assignment, AssignmentSummary, PublicAssignment } from './contract';

async function token() {
  const value = await getSessionToken();
  if (!value) redirect('/salir?motivo=expirada');
  return value;
}

/** The assignments of a course or of an assessment, newest first. */
export async function getAssignments(filter: AssignmentFilter) {
  return assignmentsApi.list(await token(), filter);
}

/** Null when it does not exist or belongs to another teacher (both are 404), so the page shows "not found". */
export async function getAssignment(id: string) {
  if (!assignmentIdSchema.safeParse(id).success) return null;
  try {
    return await assignmentsApi.get(await token(), id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** The link students open, built on the server from APP_URL so it is ready in the first render (and in the QR). */
export function studentLinkFor(shareToken: string) {
  return new URL(`/rendir/${shareToken}`, env().APP_URL).toString();
}

export type ShareTokenLookup =
  | { status: 'found'; assignment: PublicAssignment }
  | { status: 'not-found' | 'rate-limited' | 'unavailable' };

/** What the public /rendir page shows for a token. Never throws for expected outcomes. */
export async function lookUpShareToken(rawToken: string): Promise<ShareTokenLookup> {
  const shareToken = shareTokenParamSchema.safeParse(rawToken);
  if (!shareToken.success) return { status: 'not-found' };
  try {
    return { status: 'found', assignment: await publicAssignmentsApi.get(shareToken.data) };
  } catch (error) {
    if (error instanceof ApiUnavailableError) return { status: 'unavailable' };
    if (error instanceof ApiError && error.status === 404) return { status: 'not-found' };
    if (error instanceof ApiError && error.status === 429) return { status: 'rate-limited' };
    throw error;
  }
}
