import 'server-only';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { env } from '@/lib/env';
import { CHALLENGE_COOKIE } from './session-cookie';

/*
 * Between "we emailed you a code" and the code itself, the pending step lives in an httpOnly cookie: the email,
 * whether it is a sign-in or a sign-up, and (sign-in) Cognito's opaque Session. Without the code the Session is
 * worthless and Cognito binds it to the user, so the cookie needs no signature.
 */

// Matches the app client's "authentication flow session duration" (set to its maximum, 15 minutes). Cognito enforces
// the real expiry; a cookie that outlives the Session only means one "the code expired" message.
const MAX_AGE_SECONDS = 15 * 60;

const challengeSchema = z.object({
  kind: z.enum(['signIn', 'signUp']),
  email: z.string().min(1),
  // Sign-in only: sign-up codes are checked by ConfirmSignUp without a session.
  session: z.string().min(1).optional(),
});

export type Challenge = z.infer<typeof challengeSchema>;

// Pure codec (unit-tested); base64url keeps the value free of characters a cookie cannot carry.
export function encodeChallenge(challenge: Challenge) {
  return Buffer.from(JSON.stringify(challenge)).toString('base64url');
}

export function decodeChallenge(raw: string | undefined): Challenge | undefined {
  if (!raw) return undefined;
  try {
    const parsed = challengeSchema.safeParse(JSON.parse(Buffer.from(raw, 'base64url').toString()));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export async function setChallenge(challenge: Challenge) {
  (await cookies()).set(CHALLENGE_COOKIE, encodeChallenge(challenge), {
    httpOnly: true,
    secure: env().NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Readable from server components: the sign-in and sign-up pages open on the code step after a reload. */
export async function getChallenge() {
  return decodeChallenge((await cookies()).get(CHALLENGE_COOKIE)?.value);
}

export async function clearChallenge() {
  (await cookies()).delete(CHALLENGE_COOKIE);
}
