import { z } from 'zod';

/*
 * Response shapes of metis-api for assignments (docs/domain-model.md › API contract › Assignments). They live in a
 * module without `server-only` because client components use the types and the labels built on them.
 */

export const AVAILABILITIES = ['Scheduled', 'Open', 'Closed'] as const;
export const availabilitySchema = z.enum(AVAILABILITIES);
export type Availability = z.infer<typeof availabilitySchema>;

export const HELP_LEVELS = [1, 2, 3] as const;
export type HelpLevel = (typeof HELP_LEVELS)[number];

export const assignmentSummarySchema = z.object({
  id: z.uuid(),
  assessmentId: z.uuid(),
  assessmentTitle: z.string(),
  workspaceId: z.uuid(),
  workspaceName: z.string(),
  availability: availabilitySchema,
  opensAt: z.iso.datetime({ offset: true }),
  dueAt: z.iso.datetime({ offset: true }).nullable(),
  durationMinutes: z.number().int().positive(),
  resultsVisible: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
});

export const assignmentSchema = assignmentSummarySchema.extend({
  shareToken: z.string(),
  status: z.enum(['Open', 'Closed']),
  assistantEnabled: z.boolean(),
  maxHelpLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  assistantInstructions: z.string().nullable(),
});

/** What the student link shows. `strictObject`: an id or a Metis setting showing up here is a contract break. */
export const publicAssignmentSchema = z.strictObject({
  assessmentTitle: z.string(),
  instructions: z.string().nullable(),
  workspaceName: z.string(),
  teacherName: z.string(),
  itemCount: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive(),
  opensAt: z.iso.datetime({ offset: true }),
  dueAt: z.iso.datetime({ offset: true }).nullable(),
  availability: availabilitySchema,
  metisAvailable: z.boolean(),
});

export const shareTokenResponseSchema = z.object({ shareToken: z.string() });

export type AssignmentSummary = z.infer<typeof assignmentSummarySchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type PublicAssignment = z.infer<typeof publicAssignmentSchema>;

/** Ids come from the URL or the client: only UUIDs may become part of an upstream path. */
export const assignmentIdSchema = z.uuid();

/** Share tokens are 16 random bytes in base64url (22 characters); anything else cannot exist. */
export const shareTokenParamSchema = z.string().regex(/^[A-Za-z0-9_-]{22}$/);
