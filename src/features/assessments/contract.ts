import { z } from 'zod';

/*
 * Response shapes of metis-api for assessments (docs/domain-model.md › API contract › Assessments). They live in a
 * module without `server-only` because the editor also reads responses in the browser, through the /api proxy.
 */

export const ITEM_TYPES = ['SingleChoice', 'MultipleChoice', 'TrueFalse', 'Essay'] as const;
export const ASSESSMENT_STATUSES = ['Draft', 'Published', 'Archived'] as const;

export const itemTypeSchema = z.enum(ITEM_TYPES);
export const assessmentStatusSchema = z.enum(ASSESSMENT_STATUSES);

const optionSchema = z.object({ text: z.string(), isCorrect: z.boolean() });
const keyedOptionSchema = optionSchema.extend({ key: z.string() });

/**
 * What an item asks and its answer key, as metis-api sends it to the teacher: one shape per type, told apart by `type`
 * (docs/domain-model.md › Item types). Options carry the keys the server assigned.
 */
export const itemDefinitionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('SingleChoice'), options: z.array(keyedOptionSchema) }),
  z.object({ type: z.literal('MultipleChoice'), options: z.array(keyedOptionSchema) }),
  z.object({ type: z.literal('TrueFalse'), isTrue: z.boolean() }),
  z.object({
    type: z.literal('Essay'),
    minWords: z.number().int().nullable(),
    maxWords: z.number().int().nullable(),
  }),
]);

/** The same shapes as they are sent to metis-api: options without keys, and an essay's word limits optional. */
export const itemDefinitionRequestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('SingleChoice'), options: z.array(optionSchema) }),
  z.object({ type: z.literal('MultipleChoice'), options: z.array(optionSchema) }),
  z.object({ type: z.literal('TrueFalse'), isTrue: z.boolean() }),
  z.object({
    type: z.literal('Essay'),
    minWords: z.number().int().nullish(),
    maxWords: z.number().int().nullish(),
  }),
]);

/**
 * An item as its author sees it. Only `definition` is read: the flat copies metis-api still sends next to it (`type`,
 * `options`, `isTrue`, `minWords`, `maxWords`) are deprecated and dropped by the parse.
 */
export const assessmentItemSchema = z.object({
  id: z.uuid(),
  position: z.number().int().positive(),
  prompt: z.string(),
  points: z.number().positive(),
  definition: itemDefinitionSchema,
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

/**
 * A question of an AI draft (POST /api/assessments/generate), with the shape of an item body, so the draft can be sent to
 * POST /api/assessments; there are no ids or keys until it is saved. metis-api still sends draft items with the flat
 * fields (`type`, `options`, `isTrue`, `minWords`, `maxWords`) and will send `definition` instead: both are read, and
 * the parsed item has only `definition`, the shape this app sends.
 */
export const draftItemSchema = z.preprocess(
  (value) =>
    typeof value === 'object' && value !== null && !('definition' in value)
      ? { ...value, definition: value }
      : value,
  z.object({
    prompt: z.string(),
    points: z.number().positive(),
    definition: itemDefinitionRequestSchema,
    teacherNotes: z.string().nullable(),
    assistantEnabled: z.boolean(),
    studentHint: z.string().nullable(),
  }),
);

/** The AI draft. Not saved: it lives in the browser until the teacher creates the assessment from it. */
export const assessmentDraftSchema = z.object({
  title: z.string(),
  instructions: z.string().nullable(),
  items: z.array(draftItemSchema),
  /** Spanish messages from metis-api for the teacher (cuts, PDFs read as text, discarded questions, sample mode). */
  notices: z.array(z.string()),
  /** False for the sample draft built without AI. */
  aiGenerated: z.boolean(),
});

export const aiStatusSchema = z.object({ isAiAvailable: z.boolean() });

/** Ids come from the URL or the client: only UUIDs may become part of an upstream path. */
export const assessmentIdSchema = z.uuid();

export type ItemType = z.infer<typeof itemTypeSchema>;
export type AssessmentStatus = z.infer<typeof assessmentStatusSchema>;
export type ItemDefinition = z.infer<typeof itemDefinitionSchema>;
export type ItemDefinitionRequest = z.infer<typeof itemDefinitionRequestSchema>;
export type AssessmentItem = z.infer<typeof assessmentItemSchema>;
export type Assessment = z.infer<typeof assessmentSchema>;
export type AssessmentSummary = z.infer<typeof assessmentSummarySchema>;
export type StudentItem = z.infer<typeof studentItemSchema>;
export type StudentAssessment = z.infer<typeof studentAssessmentSchema>;
export type DraftItem = z.infer<typeof draftItemSchema>;
export type AssessmentDraft = z.infer<typeof assessmentDraftSchema>;

/** Body of POST/PUT /api/assessments/{id}/items: the item's type and answer go in `definition`, never in flat fields. */
export type ItemRequest = {
  prompt: string;
  points: number;
  definition: ItemDefinitionRequest;
  teacherNotes?: string;
  assistantEnabled: boolean;
  studentHint?: string;
};
