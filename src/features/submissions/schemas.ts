import { z } from 'zod';

export const startSchema = z.object({
  email: z.email({ message: 'Escribe tu email completo, por ejemplo ana@colegio.cl.' }).trim(),
});

export type StartFormState = {
  message?: string;
  fieldErrors?: { email?: string[] };
  values?: { email: string };
};

export const FEEDBACK_MAX = 2000;

export const REVIEW_COPY = {
  score: (points: string) => `Escribe un puntaje entre 0 y ${points}, con hasta 2 decimales.`,
  feedback: `El comentario puede tener hasta ${FEEDBACK_MAX} caracteres.`,
} as const;

export type ReviewField = 'score' | 'feedback';

export type ReviewFormState = {
  message?: string;
  fieldErrors?: Partial<Record<ReviewField, string[]>>;
  values?: { score: string; feedback: string };
  /** Set after a successful save. */
  ok?: boolean;
};

type ReviewResult =
  | { success: true; data: { score: number; feedback: string | null } }
  | { success: false; fieldErrors: Partial<Record<ReviewField, string[]>> };

/**
 * The score of a review, between 0 and the item's points with up to 2 decimals (a comma works too, as people write it
 * in Chile), and an optional comment. metis-api enforces the same rules; this only gives the message first.
 */
export function parseReview(
  values: { score: string; feedback: string },
  points: number,
  pointsText: string,
): ReviewResult {
  const errors: Partial<Record<ReviewField, string[]>> = {};
  const scoreText = values.score.trim().replace(',', '.');
  const score = Number(scoreText);
  if (!/^\d+(\.\d{1,2})?$/.test(scoreText) || score < 0 || score > points) {
    errors.score = [REVIEW_COPY.score(pointsText)];
  }
  const feedback = values.feedback.trim();
  if (feedback.length > FEEDBACK_MAX) errors.feedback = [REVIEW_COPY.feedback];
  if (Object.keys(errors).length > 0) return { success: false, fieldErrors: errors };
  return { success: true, data: { score, feedback: feedback || null } };
}
