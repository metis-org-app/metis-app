import { fieldErrorsFrom, parseProblem } from './problem';

describe('problem details', () => {
  it('parses an ASP.NET validation problem and normalizes field keys', () => {
    const problem = parseProblem({
      title: 'One or more validation errors occurred.',
      status: 400,
      errors: { Email: ['Invalid email.'], 'request.Password': ['Too short.'] },
    });
    expect(fieldErrorsFrom(problem)).toEqual({ email: ['Invalid email.'], password: ['Too short.'] });
  });

  it('ignores bodies that are not problem details', () => {
    expect(parseProblem('Internal Server Error')).toBeUndefined();
    expect(fieldErrorsFrom(undefined)).toEqual({});
  });
});
