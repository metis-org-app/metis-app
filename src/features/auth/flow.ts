import 'server-only';
import { z } from 'zod';
import { ApiError, ApiUnavailableError } from '@/lib/api/server';
import { authApi } from './api';
import { clearChallenge, getChallenge, setChallenge } from './challenge-cookie';
import * as cognito from './cognito';
import { type CognitoErrorCode, cognitoErrorCode, type Tokens } from './cognito';
import { codeSchema, emailSchema, type AuthFormState, type AuthStep } from './schemas';
import { setSession } from './session';

/*
 * The steps of passwordless sign-in and sign-up, shared by both server actions. Each one returns the next form state,
 * or 'done' once the session is set, so the action can redirect outside any try/catch (redirect() throws).
 */

export type FlowResult = AuthFormState | 'done';

const UNAVAILABLE = 'No pudimos conectar con Metis. Revisa tu conexión e inténtalo de nuevo en unos minutos.';
const CODE_EXPIRED = 'El código venció. Escribe tu email para recibir uno nuevo.';

const MESSAGES: Partial<Record<CognitoErrorCode, string>> = {
  tooManyRequests: 'Pediste demasiados códigos seguidos. Espera unos minutos e inténtalo de nuevo.',
  deliveryFailed: 'No pudimos enviar el email. Revisa que la dirección exista e inténtalo de nuevo.',
  invalidInput: 'Revisa los datos e inténtalo de nuevo.',
  unavailable: UNAVAILABLE,
};

export function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function failure(step: AuthStep, values: AuthFormState['values'], error: unknown): AuthFormState {
  const code = cognitoErrorCode(error);
  // A bug or a misconfiguration (wrong client id, flow not enabled): surface it instead of masking it.
  if (code === 'unknown') throw error;
  return { step, values, message: MESSAGES[code] ?? 'No pudimos continuar. Inténtalo de nuevo.' };
}

/** Sign-in, step 1: Cognito emails a code to an existing account. */
export async function startSignIn(formData: FormData): Promise<FlowResult> {
  const values = { email: text(formData, 'email') };
  const parsed = emailSchema.safeParse(values);
  if (!parsed.success)
    return { step: 'email', values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { email } = parsed.data;

  let started: cognito.SignInStart;
  try {
    started = await cognito.startSignIn(email);
  } catch (error) {
    switch (cognitoErrorCode(error)) {
      case 'userNotFound':
        return {
          step: 'email',
          values,
          fieldErrors: { email: ['No existe una cuenta con este email. Crea tu cuenta para empezar.'] },
        };
      case 'userNotConfirmed':
        return resumeSignUp(email, 'Tu cuenta aún no estaba confirmada. Te enviamos un código nuevo.');
      default:
        return failure('email', values, error);
    }
  }
  if (started.kind === 'tokens') return completeWithApi(started.tokens);
  await setChallenge({ kind: 'signIn', email, session: started.session });
  return { step: 'code', values: { email } };
}

/** An account that never confirmed its sign-up: a fresh confirmation code, and the flow continues as a sign-up. */
async function resumeSignUp(email: string, notice: string): Promise<AuthFormState> {
  try {
    await cognito.resendSignUpCode(email);
  } catch (error) {
    return failure('email', { email }, error);
  }
  await setChallenge({ kind: 'signUp', email });
  return { step: 'code', values: { email }, notice };
}

/** Sign-up, step 1: Cognito creates the account without a password and emails a confirmation code. */
export async function startSignUp(formData: FormData): Promise<FlowResult> {
  const values = { email: text(formData, 'email') };
  const parsed = emailSchema.safeParse(values);
  if (!parsed.success)
    return { step: 'email', values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { email } = parsed.data;

  try {
    await cognito.signUp(email);
  } catch (error) {
    if (cognitoErrorCode(error) !== 'usernameExists') return failure('email', values, error);
    // An abandoned sign-up (never confirmed) takes a new code and continues; a confirmed account is sent to sign in.
    try {
      await cognito.resendSignUpCode(email);
    } catch (resendError) {
      if (cognitoErrorCode(resendError) === 'alreadyConfirmed') {
        return {
          step: 'email',
          values,
          fieldErrors: { email: ['Ya existe una cuenta con este email. Ingresa con él.'] },
        };
      }
      return failure('email', values, resendError);
    }
    await setChallenge({ kind: 'signUp', email });
    return {
      step: 'code',
      values: { email },
      notice: 'Ya habías empezado a crear tu cuenta. Te enviamos un código nuevo.',
    };
  }
  await setChallenge({ kind: 'signUp', email });
  return { step: 'code', values: { email } };
}

/** Step 2 of both flows: the emailed code. */
export async function verifyCode(formData: FormData): Promise<FlowResult> {
  const challenge = await getChallenge();
  if (!challenge) return { step: 'email', message: CODE_EXPIRED };
  const values = { email: challenge.email };
  const parsed = codeSchema.safeParse({ code: text(formData, 'code') });
  if (!parsed.success) return { step: 'code', values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { code } = parsed.data;

  let tokens: Tokens;
  try {
    if (challenge.kind === 'signIn' && challenge.session) {
      tokens = await cognito.answerEmailCode(challenge.email, challenge.session, code);
    } else {
      // Confirming the sign-up proves the code, so Cognito signs the person in with that session; if it still asks
      // for a code (no session came back), the normal sign-in sends one.
      const session = await cognito.confirmSignUp(challenge.email, code);
      const started = session
        ? await cognito.signInWithConfirmedSession(challenge.email, session)
        : await cognito.startSignIn(challenge.email);
      if (started.kind === 'challenge') {
        await setChallenge({ kind: 'signIn', email: challenge.email, session: started.session });
        return {
          step: 'code',
          values,
          notice: 'Tu cuenta quedó creada. Te enviamos un código para ingresar.',
        };
      }
      tokens = started.tokens;
    }
  } catch (error) {
    switch (cognitoErrorCode(error)) {
      case 'codeMismatch':
        return {
          step: 'code',
          values,
          fieldErrors: { code: ['El código no coincide. Revísalo e inténtalo de nuevo.'] },
        };
      case 'codeExpired':
      case 'sessionExpired':
        await clearChallenge();
        return {
          step: 'email',
          values,
          message: 'El código venció o se intentó demasiadas veces. Pide uno nuevo.',
        };
      case 'alreadyConfirmed':
        await clearChallenge();
        return { step: 'email', values, message: 'Tu cuenta ya estaba confirmada. Ingresa con tu email.' };
      default:
        return failure('code', values, error);
    }
  }
  return completeWithApi(tokens);
}

/** Sends the code again: a new confirmation code (sign-up) or a new sign-in, whose Session replaces the old one. */
export async function resendCode(): Promise<FlowResult> {
  const challenge = await getChallenge();
  if (!challenge) return { step: 'email', message: CODE_EXPIRED };
  const values = { email: challenge.email };
  try {
    if (challenge.kind === 'signUp') {
      await cognito.resendSignUpCode(challenge.email);
    } else {
      const started = await cognito.startSignIn(challenge.email);
      if (started.kind === 'tokens') return completeWithApi(started.tokens);
      await setChallenge({ ...challenge, session: started.session });
    }
  } catch (error) {
    return failure('code', values, error);
  }
  return { step: 'code', values, notice: 'Te enviamos un código nuevo. Revisa también la carpeta de spam.' };
}

export async function restart(): Promise<AuthFormState> {
  await clearChallenge();
  return { step: 'email' };
}

/**
 * The callback after Cognito: metis-api creates the user and their personal organization from the ID token (or just
 * returns them), and only then the session starts, with the access token.
 */
async function completeWithApi(tokens: Tokens): Promise<FlowResult> {
  try {
    await syncWithRetry(tokens.idToken);
  } catch (error) {
    // The Cognito session is spent either way; the person asks for a new code.
    await clearChallenge();
    if (error instanceof ApiUnavailableError) return { step: 'email', message: UNAVAILABLE };
    if (error instanceof ApiError) {
      return { step: 'email', message: 'No pudimos preparar tu cuenta. Inténtalo de nuevo en unos minutos.' };
    }
    throw error;
  }
  await setSession(tokens.accessToken, tokens.expiresIn);
  await clearChallenge();
  return 'done';
}

// 409 is the race of two first syncs of the same person (the second one finds the user when it retries).
async function syncWithRetry(idToken: string) {
  try {
    return await authApi.sync(idToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) return authApi.sync(idToken);
    throw error;
  }
}
