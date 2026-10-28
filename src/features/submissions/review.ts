import type { RosterEntry, RosterStatus, SubmissionDetail } from './contract';

/*
 * What the teacher's review shows and where it goes next, computed from what metis-api returns. No grading here:
 * scores, pending counts and statuses all come from the API.
 */

export const ROSTER_STATUS_LABELS: Record<RosterStatus, string> = {
  NotStarted: 'No ha empezado',
  InProgress: 'En curso',
  Submitted: 'Entregada',
  Graded: 'Corregida',
};

/** The filters of the roster: every student, those with answers to review, or one status. */
export type RosterFilter = 'all' | 'toReview' | RosterStatus;

export const ROSTER_FILTERS: { value: RosterFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'toReview', label: 'Por revisar' },
  { value: 'NotStarted', label: ROSTER_STATUS_LABELS.NotStarted },
  { value: 'InProgress', label: ROSTER_STATUS_LABELS.InProgress },
  { value: 'Submitted', label: ROSTER_STATUS_LABELS.Submitted },
  { value: 'Graded', label: ROSTER_STATUS_LABELS.Graded },
];

export function filterRoster(roster: RosterEntry[], filter: RosterFilter): RosterEntry[] {
  if (filter === 'all') return roster;
  if (filter === 'toReview') return roster.filter((entry) => entry.pendingReviewCount > 0);
  return roster.filter((entry) => entry.status === filter);
}

export function countByFilter(roster: RosterEntry[], filter: RosterFilter): number {
  return filterRoster(roster, filter).length;
}

/** Answers waiting for the teacher, and in how many submissions. */
export function reviewTotals(roster: RosterEntry[]) {
  return roster.reduce(
    (totals, entry) => ({
      answers: totals.answers + entry.pendingReviewCount,
      submissions: totals.submissions + (entry.pendingReviewCount > 0 ? 1 : 0),
    }),
    { answers: 0, submissions: 0 },
  );
}

export type ReviewTarget = { submissionId: string; itemId: string | null };

/**
 * Where "Siguiente pendiente" goes from the submission on screen: its first question still pending, or else the next
 * student in roster order (wrapping around) with answers to review. The item of another submission is not known from
 * the roster, so that target has no item and its page opens at its first pending question. Null when nothing is left.
 */
export function nextPending(roster: RosterEntry[], current: SubmissionDetail): ReviewTarget | null {
  const ownPending = current.items.find((entry) => entry.result?.gradingStatus === 'PendingReview');
  if (ownPending) return { submissionId: current.id, itemId: ownPending.item.id };

  const start = roster.findIndex((entry) => entry.submissionId === current.id);
  for (let step = 1; step <= roster.length; step++) {
    const entry = roster[(start + step + roster.length) % roster.length];
    if (entry?.submissionId && entry.submissionId !== current.id && entry.pendingReviewCount > 0) {
      return { submissionId: entry.submissionId, itemId: null };
    }
  }
  return null;
}

/** The anchor of a question on the submission page, and of its first pending one. */
export const questionAnchor = (itemId: string) => `pregunta-${itemId}`;
export const FIRST_PENDING_ANCHOR = 'por-revisar';

export function reviewHref(assignmentId: string, target: ReviewTarget) {
  const anchor = target.itemId ? questionAnchor(target.itemId) : FIRST_PENDING_ANCHOR;
  return `/asignaciones/${assignmentId}/rendiciones/${target.submissionId}#${anchor}` as const;
}

/** "6 de 10", the score as the teacher reads it. */
export function scoreLabel(score: number, maxScore: number, format: (value: number) => string) {
  return `${format(score)} de ${format(maxScore)}`;
}
