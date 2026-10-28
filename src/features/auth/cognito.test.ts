import { CognitoIdentityProviderServiceException } from '@aws-sdk/client-cognito-identity-provider';
import { z } from 'zod';
import { cognitoErrorCode, secretHash } from './cognito';

vi.mock('@/lib/env', () => ({
  env: () => ({ COGNITO_REGION: 'us-east-1', COGNITO_CLIENT_ID: 'client', NODE_ENV: 'test' }),
}));

const serviceError = (name: string, message = name) =>
  new CognitoIdentityProviderServiceException({ name, message, $fault: 'client', $metadata: {} });

describe('secretHash', () => {
  it('is the base64 HMAC-SHA256 of username + client id with the client secret', () => {
    // echo -n "ana@colegio.clclient" | openssl dgst -sha256 -hmac secret -binary | base64
    expect(secretHash('ana@colegio.cl', 'client', 'secret')).toBe(
      'iQ9Q/qa7Iy+ZUXTBOJeBari9MvaC9atZGvFAyzrlVEQ=',
    );
  });

  it('changes with the username and is absent without a secret', () => {
    expect(secretHash('ana@colegio.cl', 'client', 'secret')).not.toBe(
      secretHash('bea@colegio.cl', 'client', 'secret'),
    );
    expect(secretHash('ana@colegio.cl', 'client', undefined)).toBeUndefined();
  });
});

describe('cognitoErrorCode', () => {
  it('maps the service errors the flow tells apart', () => {
    expect(cognitoErrorCode(serviceError('CodeMismatchException'))).toBe('codeMismatch');
    expect(cognitoErrorCode(serviceError('UserNotFoundException'))).toBe('userNotFound');
    expect(cognitoErrorCode(serviceError('UsernameExistsException'))).toBe('usernameExists');
    expect(cognitoErrorCode(serviceError('NotAuthorizedException', 'Invalid session for the user.'))).toBe(
      'sessionExpired',
    );
    expect(cognitoErrorCode(serviceError('LimitExceededException'))).toBe('tooManyRequests');
  });

  it('tells an already confirmed account apart from other invalid parameters', () => {
    expect(cognitoErrorCode(serviceError('InvalidParameterException', 'User is already confirmed.'))).toBe(
      'alreadyConfirmed',
    );
    expect(cognitoErrorCode(serviceError('InvalidParameterException', 'Invalid email address format.'))).toBe(
      'invalidInput',
    );
  });

  it('treats an unanswered request as unavailable and an unknown service error as unknown', () => {
    expect(cognitoErrorCode(new TypeError('fetch failed'))).toBe('unavailable');
    expect(cognitoErrorCode(serviceError('SomethingNewException'))).toBe('unknown');
  });

  it('surfaces a missing environment variable instead of calling it unavailable', () => {
    const missingEnv = z.object({ COGNITO_REGION: z.string() }).safeParse({});
    expect(cognitoErrorCode(missingEnv.error)).toBe('unknown');
  });
});
