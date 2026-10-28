/** Name of the httpOnly cookie that holds the Cognito access token sent to metis-api. Safe to import from proxy.ts. */
export const SESSION_COOKIE = 'metis_session';

/** Name of the httpOnly cookie that holds the pending email-code step (sign-in or sign-up). */
export const CHALLENGE_COOKIE = 'metis_auth_challenge';
