import 'server-only';
import { z } from 'zod';
import { apiRequest } from '@/lib/api/server';

// Contract: docs/domain-model.md in metis-api, section "Authentication and ownership".
export const currentUserSchema = z.object({
  // The user id is the Cognito subject: 128 bits in UUID layout, but not always an RFC 4122 variant (AWS says not
  // to validate its format strictly), so it is not z.uuid().
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  name: z.string(),
  email: z.string(),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;

export const authApi = {
  /**
   * Creates the user and their personal organization in metis-api on the first sign-in and returns the user every
   * time (idempotent). Takes the Cognito ID token: the only one that carries the verified email.
   */
  sync: (idToken: string) =>
    apiRequest('/api/auth/sync', { method: 'POST', token: idToken, schema: currentUserSchema }),
  /** Takes the Cognito access token, like every other call to metis-api. */
  me: (token: string) => apiRequest('/api/auth/me', { token, schema: currentUserSchema }),
};
