import 'server-only';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { accessKeySchema } from './contract';

/**
 * The access key of a student's submission lives in an httpOnly cookie scoped to the assignment's link
 * (`Path=/rendir/<shareToken>`): JavaScript never reads it, it never appears in a URL, and the browser sends it only to
 * that link's page and its route handlers (`/rendir/<shareToken>/sesion/*`), which relay it to metis-api. One cookie
 * per assignment, so two assignments in one browser do not mix. Reloading or reopening the link resumes the submission.
 */
export const SUBMISSION_COOKIE = 'metis_rendicion';

// Long enough to come back to the link and see the result after submitting.
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export const submissionCookiePath = (shareToken: string) => `/rendir/${shareToken}`;

export async function setAccessKey(shareToken: string, accessKey: string) {
  (await cookies()).set(SUBMISSION_COOKIE, accessKey, {
    httpOnly: true,
    secure: env().NODE_ENV === 'production',
    // Lax, not Strict: the link is opened from a QR or a chat app, and the submission must resume from there.
    sameSite: 'lax',
    path: submissionCookiePath(shareToken),
    maxAge: MAX_AGE_SECONDS,
  });
}

/** The access key for this link, if the browser has a well-formed one. Readable from server components. */
export async function getAccessKey() {
  const value = (await cookies()).get(SUBMISSION_COOKIE)?.value;
  return value && accessKeySchema.safeParse(value).success ? value : undefined;
}
