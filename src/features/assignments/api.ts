import 'server-only';
import { z } from 'zod';
import { apiRequest } from '@/lib/api/server';
import {
  assignmentSchema,
  assignmentSummarySchema,
  publicAssignmentSchema,
  shareTokenResponseSchema,
} from './contract';
import type { AssignmentSettings } from './schemas';

// Contract: metis-api docs/domain-model.md, "API contract" › "Assignments".
const base = (id: string) => `/api/assignments/${id}` as const;
const noContent = z.undefined();

export type AssignmentFilter = { workspaceId: string } | { assessmentId: string };

export const assignmentsApi = {
  list: (token: string, filter: AssignmentFilter) => {
    const query = new URLSearchParams(filter).toString();
    return apiRequest(`/api/assignments?${query}`, { token, schema: z.array(assignmentSummarySchema) });
  },
  get: (token: string, id: string) => apiRequest(base(id), { token, schema: assignmentSchema }),
  create: (
    token: string,
    body: AssignmentSettings & { assessmentId: string; workspaceId: string; resultsVisible: boolean },
  ) => apiRequest('/api/assignments', { method: 'POST', token, body, schema: assignmentSchema }),
  update: (token: string, id: string, settings: AssignmentSettings) =>
    apiRequest(base(id), { method: 'PUT', token, body: settings, schema: assignmentSchema }),
  remove: (token: string, id: string) => apiRequest(base(id), { method: 'DELETE', token, schema: noContent }),
  close: (token: string, id: string) =>
    apiRequest(`${base(id)}/close`, { method: 'POST', token, schema: assignmentSchema }),
  reopen: (token: string, id: string, dueAt: string | null) =>
    apiRequest(`${base(id)}/reopen`, {
      method: 'POST',
      token,
      body: dueAt ? { dueAt } : {},
      schema: assignmentSchema,
    }),
  setResultsVisibility: (token: string, id: string, visible: boolean) =>
    apiRequest(`${base(id)}/results-visibility`, {
      method: 'PUT',
      token,
      body: { visible },
      schema: assignmentSchema,
    }),
  regenerateShareToken: (token: string, id: string) =>
    apiRequest(`${base(id)}/share-token`, { method: 'POST', token, schema: shareTokenResponseSchema }),
};

/** Anonymous endpoint used by students. metis-api rate-limits it per client IP (forwarded by apiRequest). */
export const publicAssignmentsApi = {
  get: (shareToken: string) =>
    apiRequest(`/api/public/assignments/${shareToken}`, { schema: publicAssignmentSchema }),
};
