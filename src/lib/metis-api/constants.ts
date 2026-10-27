/*
 * Enumerations that metis-api uses in prose but the OpenAPI spec only documents as plain `string`.
 * These values are inferred from the spec descriptions and from the app contracts in
 * src/features/{workspaces,assessments,assignments,submissions}/contract.ts, which mirror the real API.
 * They are gathered here so they can be reviewed in one place.
 */

/** Workspace status ("Active | Archived"). */
export const WORKSPACE_STATUSES = ['Active', 'Archived'] as const;
export type WorkspaceStatus = (typeof WORKSPACE_STATUSES)[number];

/** Assessment status ("Draft | Published | Archived"). */
export const ASSESSMENT_STATUSES = ['Draft', 'Published', 'Archived'] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

/** Assignment availability ("Scheduled | Open | Closed"), computed from the window and the closed state. */
export const ASSIGNMENT_AVAILABILITIES = ['Scheduled', 'Open', 'Closed'] as const;
export type AssignmentAvailability = (typeof ASSIGNMENT_AVAILABILITIES)[number];

/** Assignment status: whether the assignment is accepting submissions ("Open | Closed"). */
export const ASSIGNMENT_STATUSES = ['Open', 'Closed'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

/**
 * Item type, inferred from the answer fields: single choice answers with `selectedKey`, multiple choice with
 * `selectedKeys`, true/false with `isTrue`/`value`, essay with `text` plus `minWords`/`maxWords`.
 */
export const ITEM_TYPES = ['SingleChoice', 'MultipleChoice', 'TrueFalse', 'Essay'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

/** Submission status: started and being answered, sent to the instructor, or already graded. */
export const SUBMISSION_STATUSES = ['InProgress', 'Submitted', 'Graded'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/**
 * Roster-only extension of SUBMISSION_STATUSES: the status of a roster row whose student has not started
 * (SubmissionRosterResponse.submissionId is null). The spec requires a status on every row but does not name it.
 */
export const ROSTER_SUBMISSION_STATUSES = ['NotStarted', ...SUBMISSION_STATUSES] as const;
export type RosterSubmissionStatus = (typeof ROSTER_SUBMISSION_STATUSES)[number];

/** Grading status of an item: scored automatically, waiting for the instructor, or reviewed by them. */
export const GRADING_STATUSES = ['AutoGraded', 'PendingReview', 'Reviewed'] as const;
export type GradingStatus = (typeof GRADING_STATUSES)[number];

/** Difficulty levels accepted by the assessment generator (described in the app's generator contract). */
export const AI_DIFFICULTIES = ['Basic', 'Intermediate', 'Advanced'] as const;
export type AiDifficulty = (typeof AI_DIFFICULTIES)[number];
