import { START_MESSAGES, startErrorState } from './messages';

describe('startErrorState', () => {
  it('puts "not on the roster" (403) next to the email', () => {
    expect(startErrorState(403, { status: 403 })).toEqual({
      fieldErrors: { email: [START_MESSAGES.notOnRoster] },
    });
  });

  it('tells an invalid email (400 naming email) from an assignment that is not open (400 without a field)', () => {
    expect(startErrorState(400, { errors: { email: ['Email is not valid.'] } })).toEqual({
      fieldErrors: { email: [START_MESSAGES.invalidEmail] },
    });
    expect(startErrorState(400, { detail: 'The assignment is not open.' })).toEqual({
      message: START_MESSAGES.notOpen,
    });
  });

  it('chooses the 409 message by its code, without showing any data of the submission', () => {
    expect(startErrorState(409, { code: 'alreadyStarted' })).toEqual({
      message: START_MESSAGES.alreadyStarted,
    });
    expect(startErrorState(409, { code: 'alreadySubmitted' })).toEqual({
      message: START_MESSAGES.alreadySubmitted,
    });
    // Two first starts at once: the unique index answers 409 without a code.
    expect(startErrorState(409, { title: 'Conflict' })).toEqual({ message: START_MESSAGES.alreadyStarted });
  });

  it('maps an unknown token, the rate limit and an unavailable API', () => {
    expect(startErrorState(404, undefined)).toEqual({ message: START_MESSAGES.notFound });
    expect(startErrorState(429, undefined)).toEqual({ message: START_MESSAGES.rateLimited });
    expect(startErrorState(503, undefined)).toEqual({ message: START_MESSAGES.unavailable });
    expect(startErrorState(500, undefined)).toEqual({ message: START_MESSAGES.unexpected });
  });

  it('never shows the API text, which is in English', () => {
    const state = startErrorState(400, { detail: 'The assignment is not open.' });
    expect(JSON.stringify(state)).not.toContain('assignment');
  });
});
