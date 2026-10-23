import { z } from 'zod';
import { draftItemSchema } from './contract';
import { LIMITS } from './item-draft';

// Limits mirror the metis-api domain (docs/domain-model.md › Tables › assessments); the API stays the authority.
export const titleField = z
  .string()
  .trim()
  .min(1, 'Escribe el título de la evaluación.')
  .max(LIMITS.titleMax, 'El título puede tener hasta 200 caracteres.');

export const createAssessmentSchema = z.object({ title: titleField });

export const detailsSchema = z.object({
  title: titleField,
  instructions: z
    .string()
    .trim()
    .max(LIMITS.instructionsMax, 'Las instrucciones pueden tener hasta 5000 caracteres.')
    .transform((value) => (value === '' ? null : value)),
});

export type Details = z.output<typeof detailsSchema>;

/** An AI draft the teacher reviewed and wants to save: the title and instructions they edited, and the items they kept. */
export const draftToSaveSchema = detailsSchema.extend({
  items: z
    .array(draftItemSchema)
    .min(1, 'El borrador necesita al menos una pregunta.')
    .max(LIMITS.itemsMax, 'Una evaluación puede tener hasta 100 preguntas.'),
});

export type DraftToSave = z.input<typeof draftToSaveSchema>;

/** State returned by the form actions of this feature. */
export type FormState = {
  message?: string;
  fieldErrors?: Partial<Record<'title', string[]>>;
  values?: Partial<Record<'title', string>>;
};

/** Result of actions triggered by a button (publish, archive, duplicate, delete). */
export type ActionResult = { ok: true } | { ok: false; message: string };
