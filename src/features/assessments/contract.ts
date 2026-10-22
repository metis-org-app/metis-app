import { z } from 'zod';

/*
 * Response shapes of metis-api for assessments (docs/domain-model.md › API contract › Assessments). They live in a
 * module without `server-only` because the editor also reads responses in the browser, through the /api proxy.
 */

export const ITEM_TYPES = ['SingleChoice', 'MultipleChoice', 'TrueFalse', 'Essay'] as const;
export const ASSESSMENT_STATUSES = ['Draft', 'Published', 'Archived'] as const;

export const itemTypeSchema = z.enum(ITEM_TYPES);
export const assessmentStatusSchema = z.enum(ASSESSMENT_STATUSES);

export const assessmentItemSchema = z.object({
  id: z.uuid(),
  position: z.number().int().positive(),
  type: itemTypeSchema,
  prompt: z.string(),
  points: z.number().positive(),
  options: z.array(z.object({ key: z.string(), text: z.string(), isCorrect: z.boolean() })).nullable(),
  isTrue: z.boolean().nullable(),
  minWords: z.number().int().nullable(),
  maxWords: z.number().int().nullable(),
  teacherNotes: z.string().nullable(),
  assistantEnabled: z.boolean(),
  studentHint: z.string().nullable(),
});

export const assessmentSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  instructions: z.string().nullable(),
  status: assessmentStatusSchema,
  generatedWithAi: z.boolean(),
  itemCount: z.number().int().nonnegative(),
  totalPoints: z.number().nonnegative(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(assessmentItemSchema),
});

export const assessmentSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  status: assessmentStatusSchema,
  itemCount: z.number().int().nonnegative(),
  totalPoints: z.number().nonnegative(),
  generatedWithAi: z.boolean(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
});

/** What a student sees. `strictObject`: an instructor field showing up here is a contract break, not noise. */
export const studentItemSchema = z.strictObject({
  id: z.uuid(),
  position: z.number().int().positive(),
  type: itemTypeSchema,
  prompt: z.string(),
  points: z.number().positive(),
  options: z.array(z.strictObject({ key: z.string(), text: z.string() })).nullable(),
  minWords: z.number().int().nullable(),
  maxWords: z.number().int().nullable(),
});

export const studentAssessmentSchema = z.strictObject({
  id: z.uuid(),
  title: z.string(),
  instructions: z.string().nullable(),
  itemCount: z.number().int().nonnegative(),
  totalPoints: z.number().nonnegative(),
  items: z.array(studentItemSchema),
});

/** Ids come from the URL or the client: only UUIDs may become part of an upstream path. */
export const assessmentIdSchema = z.uuid();

export type ItemType = z.infer<typeof itemTypeSchema>;
export type AssessmentStatus = z.infer<typeof assessmentStatusSchema>;
export type AssessmentItem = z.infer<typeof assessmentItemSchema>;
export type Assessment = z.infer<typeof assessmentSchema>;
export type AssessmentSummary = z.infer<typeof assessmentSummarySchema>;
export type StudentItem = z.infer<typeof studentItemSchema>;
export type StudentAssessment = z.infer<typeof studentAssessmentSchema>;

/** Body of POST/PUT /api/assessments/{id}/items. Fields that do not belong to the type are left out. */
export type ItemRequest = {
  type: ItemType;
  prompt: string;
  points: number;
  options?: { text: string; isCorrect: boolean }[];
  isTrue?: boolean;
  minWords?: number;
  maxWords?: number;
  teacherNotes?: string;
  assistantEnabled: boolean;
  studentHint?: string;
};
