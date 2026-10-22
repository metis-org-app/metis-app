import 'server-only';
import { z } from 'zod';

const schema = z.object({
  METIS_API_URL: z.url({ message: 'METIS_API_URL must be an absolute URL, e.g. http://localhost:5151' }),
  // Public origin of this app, used to build links rendered on the server (e.g. the /unirse link of a course).
  APP_URL: z.url({ message: 'APP_URL must be the absolute URL of this app, e.g. http://localhost:3000' }),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

let cached: z.infer<typeof schema> | undefined;

/** Server environment, validated on first use so a missing variable fails loudly instead of at the first request. */
export function env() {
  cached ??= schema.parse(process.env);
  return cached;
}
