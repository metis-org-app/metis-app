import 'server-only';
import { z } from 'zod';
import { apiRequest } from '@/lib/api/server';
import type { StudentInput } from './schemas';

// Contract: metis-api docs/domain-model.md, "API contract" (workspaces and public join).
export const workspaceSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  joinCode: z.string(),
  status: z.enum(['Active', 'Archived']),
  studentCount: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export const studentSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  createdAt: z.string(),
});

export const rosterResultSchema = z.object({
  added: z.array(studentSchema),
  alreadyEnrolled: z.array(z.string()),
});

export const joinInfoSchema = z.object({ workspaceName: z.string(), teacherName: z.string() });

const joinResultSchema = z.object({ workspaceName: z.string() });
const joinCodeSchema = z.object({ joinCode: z.string() });
const noContent = z.undefined();

export type Workspace = z.infer<typeof workspaceSchema>;
export type WorkspaceStatus = Workspace['status'];
export type Student = z.infer<typeof studentSchema>;
export type JoinInfo = z.infer<typeof joinInfoSchema>;

/** Ids come from the URL or the client: only UUIDs may become part of an upstream path. */
export const workspaceIdSchema = z.uuid();

/** Join codes are 8 characters from the metis-api alphabet; anything else cannot exist. */
export const joinCodeParamSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-HJKMNP-Z2-9]{8}$/);

const base = (id: string) => `/api/workspaces/${id}` as const;

export const workspacesApi = {
  list: (token: string, status: WorkspaceStatus) =>
    apiRequest(`/api/workspaces?status=${status}`, { token, schema: z.array(workspaceSchema) }),
  get: (token: string, id: string) => apiRequest(base(id), { token, schema: workspaceSchema }),
  create: (token: string, name: string) =>
    apiRequest('/api/workspaces', { method: 'POST', token, body: { name }, schema: workspaceSchema }),
  rename: (token: string, id: string, name: string) =>
    apiRequest(base(id), { method: 'PUT', token, body: { name }, schema: workspaceSchema }),
  archive: (token: string, id: string) =>
    apiRequest(`${base(id)}/archive`, { method: 'POST', token, schema: workspaceSchema }),
  restore: (token: string, id: string) =>
    apiRequest(`${base(id)}/restore`, { method: 'POST', token, schema: workspaceSchema }),
  regenerateJoinCode: (token: string, id: string) =>
    apiRequest(`${base(id)}/join-code`, { method: 'POST', token, schema: joinCodeSchema }),
  students: (token: string, id: string) =>
    apiRequest(`${base(id)}/students`, { token, schema: z.array(studentSchema) }),
  addStudent: (token: string, id: string, student: StudentInput) =>
    apiRequest(`${base(id)}/students`, { method: 'POST', token, body: student, schema: studentSchema }),
  addRoster: (token: string, id: string, students: StudentInput[]) =>
    apiRequest(`${base(id)}/students/bulk`, {
      method: 'POST',
      token,
      body: { students },
      schema: rosterResultSchema,
    }),
  updateStudent: (token: string, id: string, studentId: string, student: StudentInput) =>
    apiRequest(`${base(id)}/students/${studentId}`, {
      method: 'PUT',
      token,
      body: student,
      schema: studentSchema,
    }),
  removeStudent: (token: string, id: string, studentId: string) =>
    apiRequest(`${base(id)}/students/${studentId}`, { method: 'DELETE', token, schema: noContent }),
};

/** Anonymous endpoints used by students. metis-api rate-limits them per client IP (forwarded by apiRequest). */
export const joinApi = {
  info: (joinCode: string) => apiRequest(`/api/public/join/${joinCode}`, { schema: joinInfoSchema }),
  join: (joinCode: string, student: StudentInput) =>
    apiRequest('/api/public/join', {
      method: 'POST',
      body: { joinCode, ...student },
      schema: joinResultSchema,
    }),
};
