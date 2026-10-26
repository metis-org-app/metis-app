import 'server-only';
import { z } from 'zod';
import { apiRequest } from '@/lib/api/server';
import {
  accessKeyResponseSchema,
  rosterEntrySchema,
  studentResultSchema,
  studentSubmissionSchema,
  submissionDetailSchema,
} from './contract';

// Contract: metis-api docs/domain-model.md, "API contract" › "Submissions". Anonymous: the share token starts a
// submission and the access key reaches it. Start is rate limited per client IP, the rest per access key.
export const publicSubmissionsApi = {
  start: (shareToken: string, email: string) =>
    apiRequest(`/api/public/assignments/${shareToken}/start`, {
      method: 'POST',
      body: { email },
      schema: accessKeyResponseSchema,
    }),
  get: (accessKey: string) =>
    apiRequest(`/api/public/submissions/${accessKey}`, { schema: studentSubmissionSchema }),
  result: (accessKey: string) =>
    apiRequest(`/api/public/submissions/${accessKey}/result`, { schema: studentResultSchema }),
};

// The teacher's routes (bearer token). A submission or assignment of another teacher is a 404.
export const submissionsApi = {
  roster: (token: string, assignmentId: string) =>
    apiRequest(`/api/assignments/${assignmentId}/submissions`, { token, schema: z.array(rosterEntrySchema) }),
  get: (token: string, id: string) =>
    apiRequest(`/api/submissions/${id}`, { token, schema: submissionDetailSchema }),
  review: (token: string, id: string, itemId: string, body: { score: number; feedback: string | null }) =>
    apiRequest(`/api/submissions/${id}/items/${itemId}/review`, {
      method: 'PUT',
      token,
      body,
      schema: submissionDetailSchema,
    }),
  allowResume: (token: string, id: string) =>
    apiRequest(`/api/submissions/${id}/allow-resume`, {
      method: 'POST',
      token,
      schema: submissionDetailSchema,
    }),
};
