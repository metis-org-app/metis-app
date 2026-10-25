'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ApiError, ApiUnavailableError } from '@/lib/api/server';
import { publicSubmissionsApi } from './api';
import { shareTokenSchema } from './contract';
import { START_MESSAGES, startErrorState } from './messages';
import { startSchema, type StartFormState } from './schemas';
import { setAccessKey } from './session';

/**
 * Starts the submission with the student's email. The access key metis-api returns goes straight into the httpOnly
 * cookie of this link, and the page reloads into the submission: the key never reaches the browser's JavaScript.
 */
export async function startSubmissionAction(
  rawShareToken: string,
  _previous: StartFormState,
  formData: FormData,
): Promise<StartFormState> {
  const email = typeof formData.get('email') === 'string' ? (formData.get('email') as string) : '';
  const values = { email };
  const shareToken = shareTokenSchema.safeParse(rawShareToken);
  if (!shareToken.success) return { values, message: START_MESSAGES.notFound };

  const parsed = startSchema.safeParse({ email });
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    const { accessKey } = await publicSubmissionsApi.start(shareToken.data, parsed.data.email);
    await setAccessKey(shareToken.data, accessKey);
  } catch (error) {
    if (error instanceof ApiUnavailableError) return { values, message: START_MESSAGES.unavailable };
    if (error instanceof ApiError) return { values, ...startErrorState(error.status, error.problem) };
    throw error;
  }

  redirect(`/rendir/${shareToken.data}`);
}
