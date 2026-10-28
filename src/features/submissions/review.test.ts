import type { RosterEntry, SubmissionDetail } from './contract';
import { filterRoster, nextPending, reviewHref, reviewTotals } from './review';

const entry = (name: string, overrides: Partial<RosterEntry> = {}): RosterEntry => ({
  studentId: `00000000-0000-7000-8000-${name.padStart(12, '0')}`,
  studentName: name,
  studentEmail: `${name}@colegio.test`,
  submissionId: null,
  status: 'NotStarted',
  score: null,
  isScoreProvisional: false,
  maxScore: null,
  startedAt: null,
  submittedAt: null,
  deadline: null,
  pendingReviewCount: 0,
  resumeAllowed: false,
  ...overrides,
});

const submitted = (name: string, pending: number) =>
  entry(name, {
    submissionId: `sub-${name}`,
    status: pending > 0 ? 'Submitted' : 'Graded',
    score: 3,
    isScoreProvisional: pending > 0,
    maxScore: 10,
    pendingReviewCount: pending,
  });

const roster = [
  submitted('ana', 2),
  submitted('beto', 0),
  entry('carla', { submissionId: 'sub-carla', status: 'InProgress' }),
  submitted('diego', 1),
  entry('elena'),
];

const detail = (id: string, pendingItems: string[]): SubmissionDetail =>
  ({
    id,
    items: ['i1', 'i2', 'i3'].map((itemId) => ({
      item: { id: itemId },
      response: null,
      result: { score: null, gradingStatus: pendingItems.includes(itemId) ? 'PendingReview' : 'AutoGraded' },
    })),
  }) as unknown as SubmissionDetail;

describe('filterRoster', () => {
  it('keeps everyone, those to review, or one status', () => {
    expect(filterRoster(roster, 'all')).toHaveLength(5);
    expect(filterRoster(roster, 'toReview').map((e) => e.studentName)).toEqual(['ana', 'diego']);
    expect(filterRoster(roster, 'NotStarted').map((e) => e.studentName)).toEqual(['elena']);
    expect(filterRoster(roster, 'InProgress').map((e) => e.studentName)).toEqual(['carla']);
    expect(filterRoster(roster, 'Submitted').map((e) => e.studentName)).toEqual(['ana', 'diego']);
    expect(filterRoster(roster, 'Graded').map((e) => e.studentName)).toEqual(['beto']);
  });
});

describe('reviewTotals', () => {
  it('adds the pending answers and counts the submissions with any', () => {
    expect(reviewTotals(roster)).toEqual({ answers: 3, submissions: 2 });
    expect(reviewTotals([])).toEqual({ answers: 0, submissions: 0 });
  });
});

describe('nextPending', () => {
  it('goes to the first pending question of the submission on screen', () => {
    expect(nextPending(roster, detail('sub-ana', ['i2', 'i3']))).toEqual({
      submissionId: 'sub-ana',
      itemId: 'i2',
    });
  });

  it('then to the next student with answers to review', () => {
    expect(nextPending(roster, detail('sub-ana', []))).toEqual({ submissionId: 'sub-diego', itemId: null });
  });

  it('wraps around to the start of the roster', () => {
    expect(nextPending(roster, detail('sub-diego', []))).toEqual({ submissionId: 'sub-ana', itemId: null });
  });

  it('skips the current submission even when the roster still counts it as pending', () => {
    const stale = [submitted('ana', 1)];
    expect(nextPending(stale, detail('sub-ana', []))).toBeNull();
  });

  it('is null when nothing is left to review', () => {
    const done = roster.map((e) => ({ ...e, pendingReviewCount: 0 }));
    expect(nextPending(done, detail('sub-beto', []))).toBeNull();
  });
});

describe('reviewHref', () => {
  it('points at the question, or at the first pending one of another submission', () => {
    expect(reviewHref('a1', { submissionId: 's1', itemId: 'i2' })).toBe(
      '/asignaciones/a1/rendiciones/s1#pregunta-i2',
    );
    expect(reviewHref('a1', { submissionId: 's2', itemId: null })).toBe(
      '/asignaciones/a1/rendiciones/s2#por-revisar',
    );
  });
});
