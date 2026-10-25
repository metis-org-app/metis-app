import 'server-only';
import { apiRequest } from '@/lib/api/server';
import { accessKeyResponseSchema, studentResultSchema, studentSubmissionSchema } from './contract';

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
