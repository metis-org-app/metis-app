import 'server-only';
import { z } from 'zod';
import { apiRequest } from '@/lib/api/server';
import type { LoginInput, RegisterInput } from './schemas';

// Contract: docs/domain-model.md in metis-api, section "Authentication and ownership".
const tokenResponse = z.object({
  tokenType: z.string(),
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
  refreshToken: z.string().optional(),
});

export const currentUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;

export const authApi = {
  login: (input: LoginInput) =>
    apiRequest('/api/auth/login', { method: 'POST', body: input, schema: tokenResponse }),
  register: (input: RegisterInput) =>
    apiRequest('/api/auth/register', { method: 'POST', body: input, schema: tokenResponse }),
  me: (token: string) => apiRequest('/api/auth/me', { token, schema: currentUserSchema }),
};
