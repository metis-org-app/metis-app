'use server';

import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { safeRedirect } from '@/lib/safe-redirect';
import { clearChallenge } from './challenge-cookie';
import { type FlowResult, resendCode, restart, startSignIn, startSignUp, text, verifyCode } from './flow';
import type { AuthFormState } from './schemas';
import { clearSession } from './session';

/*
 * One action per form, with two steps (email, then the emailed code). The button that submitted the form says what
 * to do through its `intent` value; the first step is the only one that differs between sign-in and sign-up.
 */
async function run(
  formData: FormData,
  start: (formData: FormData) => Promise<FlowResult>,
): Promise<FlowResult> {
  switch (text(formData, 'intent')) {
    case 'verify':
      return verifyCode(formData);
    case 'resend':
      return resendCode();
    case 'restart':
      return restart();
    default:
      return start(formData);
  }
}

export async function signInAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const result = await run(formData, startSignIn);
  if (result !== 'done') return result;
  // Outside every try/catch: redirect() throws. safeRedirect guarantees a same-origin path; typed routes cannot know
  // it is a valid page.
  redirect(safeRedirect(text(formData, 'desde')) as Route);
}

export async function signUpAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const result = await run(formData, startSignUp);
  if (result !== 'done') return result;
  redirect('/inicio');
}

export async function logoutAction() {
  await clearSession();
  await clearChallenge();
  redirect('/ingresar');
}
