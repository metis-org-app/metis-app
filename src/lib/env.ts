import 'server-only';
import { z } from 'zod';

const schema = z
  .object({
    METIS_API_URL: z.url({ message: 'METIS_API_URL must be an absolute URL, e.g. http://localhost:5151' }),
    // Public origin of this app, used to build links rendered on the server (e.g. the /unirse link of a course).
    APP_URL: z.url({ message: 'APP_URL must be the absolute URL of this app, e.g. http://localhost:3000' }),
    // Shared with metis-api (ClientIp:ProxySecret), which trusts the client IP this server forwards only with it.
    // Never sent to the browser. An empty value counts as missing.
    METIS_PROXY_SECRET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z
        .string()
        .min(32, { message: 'METIS_PROXY_SECRET must have at least 32 characters (openssl rand -base64 32)' })
        .optional(),
    ),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // Cognito user pool for passwordless sign-in (one-time code by email). Server-only: the browser never talks to Cognito.
    COGNITO_REGION: z
      .string()
      .regex(/^[a-z]{2}-[a-z]+-\d$/, { message: 'COGNITO_REGION must be an AWS region, e.g. us-east-1' }),
    COGNITO_CLIENT_ID: z
      .string()
      .min(1, { message: 'COGNITO_CLIENT_ID is the app client id of the user pool' }),
    // Only when the app client has a secret: then every Cognito call carries SECRET_HASH. An empty value counts as unset.
    COGNITO_CLIENT_SECRET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(1).optional(),
    ),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production' && !value.METIS_PROXY_SECRET) {
      context.addIssue({
        code: 'custom',
        path: ['METIS_PROXY_SECRET'],
        message:
          'METIS_PROXY_SECRET is required in production: the same value as ClientIp__ProxySecret in metis-api',
      });
    }
  });

let cached: z.infer<typeof schema> | undefined;

/** Server environment, validated on first use so a missing variable fails loudly instead of at the first request. */
export function env() {
  cached ??= schema.parse(process.env);
  return cached;
}
