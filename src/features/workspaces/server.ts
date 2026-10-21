// Server-only entry of the workspaces feature: data for the course pages and the public join page.
import 'server-only';
import { redirect } from 'next/navigation';
import { getSessionToken } from '@/features/auth/server';
import { ApiError, ApiUnavailableError } from '@/lib/api/server';
import { joinApi, joinCodeParamSchema, workspaceIdSchema, workspacesApi, type WorkspaceStatus } from './api';

export type { JoinInfo, Student, Workspace, WorkspaceStatus } from './api';

async function token() {
  const value = await getSessionToken();
  if (!value) redirect('/salir?motivo=expirada');
  return value;
}

export async function getWorkspaces(status: WorkspaceStatus) {
  return workspacesApi.list(await token(), status);
}

/** The workspace and its roster, or null when it does not exist or belongs to another teacher (both are 404). */
export async function getWorkspaceWithRoster(id: string) {
  if (!workspaceIdSchema.safeParse(id).success) return null;
  const sessionToken = await token();
  try {
    const [workspace, students] = await Promise.all([
      workspacesApi.get(sessionToken, id),
      workspacesApi.students(sessionToken, id),
    ]);
    return { workspace, students };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export type JoinLookup =
  | { status: 'found'; code: string; info: { workspaceName: string; teacherName: string } }
  | { status: 'not-found' | 'rate-limited' | 'unavailable' };

/** What the public join page shows for a code. Never throws for expected outcomes. */
export async function lookUpJoinCode(rawCode: string): Promise<JoinLookup> {
  const code = joinCodeParamSchema.safeParse(rawCode);
  if (!code.success) return { status: 'not-found' };
  try {
    return { status: 'found', code: code.data, info: await joinApi.info(code.data) };
  } catch (error) {
    if (error instanceof ApiUnavailableError) return { status: 'unavailable' };
    if (error instanceof ApiError && error.status === 404) return { status: 'not-found' };
    if (error instanceof ApiError && error.status === 429) return { status: 'rate-limited' };
    throw error;
  }
}
