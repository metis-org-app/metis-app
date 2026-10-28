import 'server-only';
import { createHmac } from 'node:crypto';
import {
  CognitoIdentityProviderClient,
  CognitoIdentityProviderServiceException,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  RespondToAuthChallengeCommand,
  SignUpCommand,
  type AuthenticationResultType,
  type InitiateAuthCommandOutput,
  type RespondToAuthChallengeCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import { ZodError } from 'zod';
import { env } from '@/lib/env';

/*
 * Server-side client of the Cognito user pool: passwordless sign-up and sign-in with a one-time code sent by email
 * (the USER_AUTH flow with EMAIL_OTP). The five operations used here are public ("noAuth" in the SDK): no IAM
 * credentials, only the app client id and, when the client has one, its secret as SECRET_HASH.
 */

let client: CognitoIdentityProviderClient | undefined;

function cognito() {
  // One retry at most: a retried InitiateAuth or SignUp sends the person a second email.
  client ??= new CognitoIdentityProviderClient({ region: env().COGNITO_REGION, maxAttempts: 2 });
  return client;
}

/** Base64(HMAC-SHA256(secret, username + clientId)): required by every call when the app client has a secret. */
export function secretHash(username: string, clientId: string, clientSecret: string | undefined) {
  if (!clientSecret) return undefined;
  return createHmac('sha256', clientSecret)
    .update(username + clientId)
    .digest('base64');
}

function hashFor(email: string) {
  const { COGNITO_CLIENT_ID, COGNITO_CLIENT_SECRET } = env();
  return secretHash(email, COGNITO_CLIENT_ID, COGNITO_CLIENT_SECRET);
}

function withHash(email: string): Record<string, string> {
  const hash = hashFor(email);
  return hash ? { SECRET_HASH: hash } : {};
}

export type Tokens = { accessToken: string; idToken: string; expiresIn: number };

/** InitiateAuth either signs the person in or asks for the emailed code, with an opaque Session to answer with. */
export type SignInStart = { kind: 'tokens'; tokens: Tokens } | { kind: 'challenge'; session: string };

export type CognitoErrorCode =
  | 'userNotFound'
  | 'userNotConfirmed'
  | 'usernameExists'
  | 'alreadyConfirmed'
  | 'codeMismatch'
  | 'codeExpired'
  | 'sessionExpired'
  | 'tooManyRequests'
  | 'deliveryFailed'
  | 'invalidInput'
  | 'unavailable'
  | 'unknown';

const BY_NAME: Record<string, CognitoErrorCode> = {
  UserNotFoundException: 'userNotFound', // only while the app client does not prevent user existence errors
  UserNotConfirmedException: 'userNotConfirmed',
  UsernameExistsException: 'usernameExists',
  CodeMismatchException: 'codeMismatch',
  ExpiredCodeException: 'codeExpired',
  NotAuthorizedException: 'sessionExpired', // invalid or expired session, or too many wrong codes
  TooManyRequestsException: 'tooManyRequests',
  LimitExceededException: 'tooManyRequests',
  TooManyFailedAttemptsException: 'tooManyRequests',
  CodeDeliveryFailureException: 'deliveryFailed',
  InvalidParameterException: 'invalidInput',
};

/** Maps an SDK error to a code the flow turns into Spanish copy. Pure, so it is unit-tested. */
export function cognitoErrorCode(error: unknown): CognitoErrorCode {
  // A missing or invalid COGNITO_* variable (env() throws): a deployment error to surface, not "unavailable".
  if (error instanceof ZodError) return 'unknown';
  if (error instanceof CognitoIdentityProviderServiceException) {
    if (error.name === 'InvalidParameterException' && /already confirmed/i.test(error.message)) {
      return 'alreadyConfirmed';
    }
    return BY_NAME[error.name] ?? 'unknown';
  }
  // No $metadata: the request never got an answer (DNS, timeout, connection refused).
  return typeof error === 'object' && error !== null && '$metadata' in error ? 'unknown' : 'unavailable';
}

function tokensFrom(result: AuthenticationResultType | undefined): Tokens | undefined {
  if (!result?.AccessToken || !result.IdToken || !result.ExpiresIn) return undefined;
  return { accessToken: result.AccessToken, idToken: result.IdToken, expiresIn: result.ExpiresIn };
}

/** Turns an auth response into tokens or an EMAIL_OTP challenge; answers SELECT_CHALLENGE with EMAIL_OTP if asked. */
async function settle(
  email: string,
  response: InitiateAuthCommandOutput | RespondToAuthChallengeCommandOutput,
): Promise<SignInStart> {
  const tokens = tokensFrom(response.AuthenticationResult);
  if (tokens) return { kind: 'tokens', tokens };
  if (response.ChallengeName === 'SELECT_CHALLENGE' && response.Session) {
    const chosen = await cognito().send(
      new RespondToAuthChallengeCommand({
        ClientId: env().COGNITO_CLIENT_ID,
        ChallengeName: 'SELECT_CHALLENGE',
        Session: response.Session,
        ChallengeResponses: { USERNAME: email, ANSWER: 'EMAIL_OTP', ...withHash(email) },
      }),
    );
    return settle(email, chosen);
  }
  if (response.ChallengeName === 'EMAIL_OTP' && response.Session) {
    return { kind: 'challenge', session: response.Session };
  }
  throw new Error(`Unexpected Cognito challenge: ${response.ChallengeName ?? 'none'}`);
}

/** Creates the account without a password; Cognito emails a confirmation code. */
export async function signUp(email: string) {
  await cognito().send(
    new SignUpCommand({
      ClientId: env().COGNITO_CLIENT_ID,
      Username: email,
      UserAttributes: [{ Name: 'email', Value: email }],
      SecretHash: hashFor(email),
    }),
  );
}

export async function resendSignUpCode(email: string) {
  await cognito().send(
    new ResendConfirmationCodeCommand({
      ClientId: env().COGNITO_CLIENT_ID,
      Username: email,
      SecretHash: hashFor(email),
    }),
  );
}

/** Confirms the account and returns the Session that signs the person in without a second code (if Cognito gives one). */
export async function confirmSignUp(email: string, code: string) {
  const result = await cognito().send(
    new ConfirmSignUpCommand({
      ClientId: env().COGNITO_CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
      SecretHash: hashFor(email),
    }),
  );
  return result.Session;
}

/** Starts passwordless sign-in: Cognito emails a code and returns the Session to answer with. */
export async function startSignIn(email: string) {
  const response = await cognito().send(
    new InitiateAuthCommand({
      ClientId: env().COGNITO_CLIENT_ID,
      AuthFlow: 'USER_AUTH',
      AuthParameters: { USERNAME: email, PREFERRED_CHALLENGE: 'EMAIL_OTP', ...withHash(email) },
    }),
  );
  return settle(email, response);
}

/** Sign-in right after ConfirmSignUp with its Session: the code just entered counts, so tokens come back directly. */
export async function signInWithConfirmedSession(email: string, session: string) {
  const response = await cognito().send(
    new InitiateAuthCommand({
      ClientId: env().COGNITO_CLIENT_ID,
      AuthFlow: 'USER_AUTH',
      Session: session,
      AuthParameters: { USERNAME: email, ...withHash(email) },
    }),
  );
  return settle(email, response);
}

export async function answerEmailCode(email: string, session: string, code: string): Promise<Tokens> {
  const response = await cognito().send(
    new RespondToAuthChallengeCommand({
      ClientId: env().COGNITO_CLIENT_ID,
      ChallengeName: 'EMAIL_OTP',
      Session: session,
      ChallengeResponses: { USERNAME: email, EMAIL_OTP_CODE: code, ...withHash(email) },
    }),
  );
  const tokens = tokensFrom(response.AuthenticationResult);
  if (!tokens) throw new Error(`Expected tokens after EMAIL_OTP, got ${response.ChallengeName ?? 'nothing'}`);
  return tokens;
}
