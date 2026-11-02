/**
 * Development-only session that stands in for a Cognito access token, so the owners of the site can work on
 * the app locally without signing in. It is only ever issued when NODE_ENV is 'development' (see
 * getSessionToken), and it never reaches metis-api: apiRequest answers it with stub data.
 */
export const DEV_SESSION_TOKEN = 'metis-dev-session';

/** The development session token in development, undefined everywhere else (production never sees it). */
export function devSessionToken(): string | undefined {
  return process.env.NODE_ENV === 'development' ? DEV_SESSION_TOKEN : undefined;
}

/** Whether this is that development session instead of a real Cognito access token. */
export function isDevSession(token: string | undefined): boolean {
  return token !== undefined && token === devSessionToken();
}
