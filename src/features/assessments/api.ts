import 'server-only';
import { z } from 'zod';
import { apiRequest } from '@/lib/api/server';
import {
  aiStatusSchema,
  assessmentSchema,
  assessmentSummarySchema,
  studentAssessmentSchema,
  type AssessmentStatus,
  type DraftItem,
} from './contract';

// Contract: metis-api docs/domain-model.md, "API contract" › "Assessments". The schemas live in ./contract because
// the editor also reads these responses in the browser.
const base = (id: string) => `/api/assessments/${id}` as const;
const noContent = z.undefined();

export const assessmentsApi = {
  list: (token: string, status: AssessmentStatus) =>
    apiRequest(`/api/assessments?status=${status}`, { token, schema: z.array(assessmentSummarySchema) }),
  get: (token: string, id: string) => apiRequest(base(id), { token, schema: assessmentSchema }),
  preview: (token: string, id: string) =>
    apiRequest(`${base(id)}/preview`, { token, schema: studentAssessmentSchema }),
  create: (token: string, title: string) =>
    apiRequest('/api/assessments', { method: 'POST', token, body: { title }, schema: assessmentSchema }),
  /** Saves an AI draft as a new Draft assessment with its items, in one call. */
  createFromDraft: (
    token: string,
    draft: { title: string; instructions: string | null; items: DraftItem[] },
  ) =>
    apiRequest('/api/assessments', {
      method: 'POST',
      token,
      body: { ...draft, generatedWithAi: true },
      schema: assessmentSchema,
    }),
  aiStatus: (token: string) => apiRequest('/api/ai/status', { token, schema: aiStatusSchema }),
  remove: (token: string, id: string) => apiRequest(base(id), { method: 'DELETE', token, schema: noContent }),
  publish: (token: string, id: string) =>
    apiRequest(`${base(id)}/publish`, { method: 'POST', token, schema: assessmentSchema }),
  archive: (token: string, id: string) =>
    apiRequest(`${base(id)}/archive`, { method: 'POST', token, schema: assessmentSchema }),
  duplicate: (token: string, id: string) =>
    apiRequest(`${base(id)}/duplicate`, { method: 'POST', token, schema: assessmentSchema }),
};
