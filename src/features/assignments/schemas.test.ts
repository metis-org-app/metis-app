import {
  FIELD_COPY,
  parseSettings,
  parseTarget,
  readAssignmentForm,
  type AssignmentFormValues,
} from './schemas';

const now = new Date('2026-11-02T12:00:00Z');
const valid: AssignmentFormValues = {
  opensMode: 'now',
  dueMode: 'none',
  durationMinutes: '45',
  assistantEnabled: true,
  maxHelpLevel: '2',
  assistantInstructions: '',
};

const errorsOf = (values: AssignmentFormValues, currentDueAt?: string | null) => {
  const result = parseSettings({ ...valid, ...values }, { now, currentDueAt });
  return result.success ? {} : result.fieldErrors;
};

describe('readAssignmentForm', () => {
  it('reads switches as booleans and defaults the modes', () => {
    const formData = new FormData();
    formData.set('durationMinutes', '45');
    formData.set('assistantEnabled', 'on');
    expect(readAssignmentForm(formData)).toMatchObject({
      opensMode: 'now',
      dueMode: 'none',
      assistantEnabled: true,
      resultsVisible: false,
    });
  });
});

describe('parseSettings', () => {
  it('opens now and has no close date by default', () => {
    expect(parseSettings(valid, { now })).toEqual({
      success: true,
      data: {
        dueAt: null,
        durationMinutes: 45,
        assistantEnabled: true,
        maxHelpLevel: 2,
        assistantInstructions: null,
      },
    });
  });

  it('sends the chosen dates as typed (ISO with offset)', () => {
    const result = parseSettings(
      {
        ...valid,
        opensMode: 'at',
        opensAt: '2026-11-03T08:00:00-03:00',
        dueMode: 'at',
        dueAt: '2026-11-03T10:00:00-03:00',
      },
      { now },
    );
    expect(result).toMatchObject({
      success: true,
      data: { opensAt: '2026-11-03T08:00:00-03:00', dueAt: '2026-11-03T10:00:00-03:00' },
    });
  });

  it('asks for the date when "a date" is chosen without one', () => {
    expect(errorsOf({ opensMode: 'at', opensAt: '' })).toEqual({ opensAt: [FIELD_COPY.opensAt] });
    expect(errorsOf({ dueMode: 'at', dueAt: '' })).toEqual({ dueAt: [FIELD_COPY.dueAt] });
    // Without an offset the moment is ambiguous, so it is not accepted.
    expect(errorsOf({ dueMode: 'at', dueAt: '2026-11-03T10:00' })).toEqual({ dueAt: [FIELD_COPY.dueAt] });
  });

  it('rejects a close date in the past or not after the opening', () => {
    expect(errorsOf({ dueMode: 'at', dueAt: '2026-11-02T08:00:00-03:00' })).toEqual({
      dueAt: [FIELD_COPY.dueInFuture],
    });
    expect(
      errorsOf({
        opensMode: 'at',
        opensAt: '2026-11-05T08:00:00-03:00',
        dueMode: 'at',
        dueAt: '2026-11-04T08:00:00-03:00',
      }),
    ).toEqual({ dueAt: [FIELD_COPY.dueAfterOpen] });
  });

  it('lets an edit keep a close date that already passed', () => {
    const past = '2026-11-01T10:00:00.000Z';
    expect(
      errorsOf({ opensMode: 'at', opensAt: '2026-10-30T10:00:00Z', dueMode: 'at', dueAt: past }, past),
    ).toEqual({});
  });

  it('keeps the duration between 5 and 240 whole minutes', () => {
    for (const durationMinutes of ['4', '241', '', '45.5', 'abc']) {
      expect(errorsOf({ durationMinutes })).toEqual({ durationMinutes: [FIELD_COPY.durationMinutes] });
    }
    for (const durationMinutes of ['5', '240']) expect(errorsOf({ durationMinutes })).toEqual({});
  });

  it('accepts help levels 1 to 3 and Metis instructions up to 2000 characters', () => {
    expect(errorsOf({ maxHelpLevel: '0' })).toEqual({ maxHelpLevel: [FIELD_COPY.maxHelpLevel] });
    expect(errorsOf({ maxHelpLevel: '3' })).toEqual({});
    expect(errorsOf({ assistantInstructions: 'x'.repeat(2001) })).toEqual({
      assistantInstructions: [FIELD_COPY.assistantInstructions],
    });
  });
});

describe('parseTarget', () => {
  it('requires both the assessment and the course', () => {
    expect(parseTarget({ assessmentId: '', workspaceId: 'x' })).toEqual({
      success: false,
      fieldErrors: { assessmentId: [FIELD_COPY.assessmentId], workspaceId: [FIELD_COPY.workspaceId] },
    });
  });
});

describe('parseSettings with submissions (extendOnly)', () => {
  const currentDueAt = '2026-11-05T12:00:00Z';
  const withSubmissions = (dueAt: string | undefined, dueMode: 'at' | 'none' = 'at') => {
    const result = parseSettings({ ...valid, dueMode, dueAt }, { now, currentDueAt, extendOnly: true });
    return result.success ? {} : result.fieldErrors;
  };

  it('keeps the current close date when it comes back without its seconds', () => {
    const result = parseSettings(
      { ...valid, dueMode: 'at', dueAt: '2026-11-05T12:00:00Z' },
      { now, currentDueAt: '2026-11-05T12:00:49Z', extendOnly: true },
    );
    expect(result).toMatchObject({ success: true, data: { dueAt: '2026-11-05T12:00:49Z' } });
  });

  it('accepts a later close date, the same one, or none', () => {
    expect(withSubmissions('2026-11-06T12:00:00Z')).toEqual({});
    expect(withSubmissions(currentDueAt)).toEqual({});
    expect(withSubmissions(undefined, 'none')).toEqual({});
  });

  it('rejects bringing the close date forward', () => {
    expect(withSubmissions('2026-11-04T12:00:00Z')).toEqual({ dueAt: [FIELD_COPY.dueExtendOnly] });
  });

  it('allows any future date when the current one already passed', () => {
    const result = parseSettings(
      { ...valid, dueMode: 'at', dueAt: '2026-11-03T12:00:00Z' },
      { now, currentDueAt: '2026-11-01T12:00:00Z', extendOnly: true },
    );
    expect(result.success).toBe(true);
  });
});
