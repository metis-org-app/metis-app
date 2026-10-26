import { z } from 'zod';
import { assessmentItemSchema, studentItemSchema } from '@/features/assessments';

/*
 * Response shapes of metis-api for a student's submission (docs/domain-model.md › API contract › Submissions). They
 * live in a module without `server-only` because the submission screen reads responses in the browser. The student
 * shapes are `strictObject`: an answer key or a Metis setting showing up here is a contract break, not noise.
 */

export const SUBMISSION_STATUSES = ['InProgress', 'Submitted', 'Graded'] as const;
export const submissionStatusSchema = z.enum(SUBMISSION_STATUSES);
export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;

export const GRADING_STATUSES = ['AutoGraded', 'PendingReview', 'Reviewed'] as const;
export const gradingStatusSchema = z.enum(GRADING_STATUSES);

const dateTime = z.iso.datetime({ offset: true });

/** A response with the shape of its item type ("Item types" in the domain model). */
export const apiAnswerSchema = z.union([
  z.strictObject({ selectedKey: z.string() }),
  z.strictObject({ selectedKeys: z.array(z.string()) }),
  z.strictObject({ value: z.boolean() }),
  z.strictObject({ text: z.string() }),
]);
export type ApiAnswer = z.infer<typeof apiAnswerSchema>;

export const responseEntrySchema = z.strictObject({
  itemId: z.uuid(),
  response: apiAnswerSchema.nullable(),
  updatedAt: dateTime.nullable(),
});

/** The preview's student view of an item plus whether Metis can help on it (computed by the API, for step 7). */
export const submissionItemSchema = studentItemSchema.extend({ metisAvailable: z.boolean() });
export type SubmissionItem = z.infer<typeof submissionItemSchema>;

export const studentSubmissionSchema = z.strictObject({
  status: submissionStatusSchema,
  assessmentTitle: z.string(),
  instructions: z.string().nullable(),
  items: z.array(submissionItemSchema),
  responses: z.array(responseEntrySchema),
  startedAt: dateTime,
  deadline: dateTime,
  serverNow: dateTime,
  submittedAt: dateTime.nullable(),
});
export type StudentSubmission = z.infer<typeof studentSubmissionSchema>;

export const savedResponsesSchema = z.strictObject({
  status: submissionStatusSchema,
  deadline: dateTime,
  serverNow: dateTime,
  responses: z.array(responseEntrySchema),
});

export const submitResultSchema = z.strictObject({
  status: submissionStatusSchema,
  submittedAt: dateTime.nullable(),
});

export const resultItemSchema = z.strictObject({
  itemId: z.uuid(),
  position: z.number().int().positive(),
  type: studentItemSchema.shape.type,
  prompt: z.string(),
  points: z.number().positive(),
  options: z.array(z.strictObject({ key: z.string(), text: z.string() })).nullable(),
  minWords: z.number().int().nullable(),
  maxWords: z.number().int().nullable(),
  response: apiAnswerSchema.nullable(),
  score: z.number().nullable(),
  gradingStatus: gradingStatusSchema.nullable(),
  feedback: z.string().nullable(),
});
export type ResultItem = z.infer<typeof resultItemSchema>;

export const studentResultSchema = z.strictObject({
  status: submissionStatusSchema,
  submittedAt: dateTime.nullable(),
  resultsVisible: z.boolean(),
  result: z
    .strictObject({
      score: z.number(),
      maxScore: z.number(),
      percentage: z.number(),
      isProvisional: z.boolean(),
      items: z.array(resultItemSchema),
    })
    .nullable(),
});
export type StudentResult = z.infer<typeof studentResultSchema>;

export const accessKeyResponseSchema = z.strictObject({ accessKey: z.string() });

/** Access keys and share tokens are 16 random bytes in base64url (22 characters); anything else cannot exist. */
export const accessKeySchema = z.string().regex(/^[A-Za-z0-9_-]{22}$/);
export const shareTokenSchema = accessKeySchema;

/*
 * The teacher's views of submissions (API contract › Submissions › instructor routes). Plain objects, not strict: the
 * teacher may see everything, and the answer keys come in the instructor view of each item.
 */

export const ROSTER_STATUSES = ['NotStarted', 'InProgress', 'Submitted', 'Graded'] as const;
export const rosterStatusSchema = z.enum(ROSTER_STATUSES);
export type RosterStatus = z.infer<typeof rosterStatusSchema>;

/** One student of the course with their submission of the assignment, if any. */
export const rosterEntrySchema = z.object({
  studentId: z.uuid(),
  studentName: z.string(),
  studentEmail: z.string(),
  submissionId: z.uuid().nullable(),
  status: rosterStatusSchema,
  score: z.number().nullable(),
  isScoreProvisional: z.boolean(),
  maxScore: z.number().nullable(),
  startedAt: dateTime.nullable(),
  submittedAt: dateTime.nullable(),
  deadline: dateTime.nullable(),
  pendingReviewCount: z.number().int().nonnegative(),
  resumeAllowed: z.boolean(),
});
export type RosterEntry = z.infer<typeof rosterEntrySchema>;

export const itemResultSchema = z.object({
  score: z.number().nullable(),
  gradingStatus: gradingStatusSchema,
  feedback: z.string().nullable(),
  gradedAt: dateTime.nullable(),
});

export const reviewItemSchema = z.object({
  item: assessmentItemSchema,
  response: apiAnswerSchema.nullable(),
  /** Null while the submission is in progress. */
  result: itemResultSchema.nullable(),
});
export type ReviewItem = z.infer<typeof reviewItemSchema>;

export const submissionDetailSchema = z.object({
  id: z.uuid(),
  assignmentId: z.uuid(),
  assessmentTitle: z.string(),
  student: z.object({ id: z.uuid(), name: z.string(), email: z.string() }),
  status: submissionStatusSchema,
  startedAt: dateTime,
  submittedAt: dateTime.nullable(),
  deadline: dateTime,
  score: z.number().nullable(),
  isScoreProvisional: z.boolean(),
  maxScore: z.number(),
  gradedAt: dateTime.nullable(),
  pendingReviewCount: z.number().int().nonnegative(),
  resumeAllowed: z.boolean(),
  items: z.array(reviewItemSchema),
});
export type SubmissionDetail = z.infer<typeof submissionDetailSchema>;

/** Submission ids come from the URL: only UUIDs may become part of an upstream path. */
export const submissionIdSchema = z.uuid();
