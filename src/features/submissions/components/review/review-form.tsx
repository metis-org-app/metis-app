'use client';

import { CircleCheck, LoaderCircle, Pencil } from 'lucide-react';
import { useActionState, useId, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { reviewItemAction } from '../../actions';
import { FEEDBACK_MAX, type ReviewFormState } from '../../schemas';

export type ReviewTargetItem = {
  assignmentId: string;
  submissionId: string;
  itemId: string;
  points: number;
  /** The item's points as the teacher reads them ("4", "2,5"). */
  pointsText: string;
};

/**
 * The score and comment of one question, saved with "Guardar revisión". A pending essay shows it open; a question
 * already graded shows it behind "Corregir puntaje" (automatic) or "Editar revisión" (reviewed by the teacher).
 */
export function ReviewForm({
  target,
  mode,
  initial,
}: {
  target: ReviewTargetItem;
  mode: 'pending' | 'auto' | 'reviewed';
  initial: { score: string; feedback: string };
}) {
  const id = useId();
  const [state, formAction, pending] = useActionState<ReviewFormState, FormData>(
    reviewItemAction.bind(null, target),
    {},
  );
  const [opened, setOpened] = useState(false);
  // The result that was on screen when the teacher opened the form again: a save older than that is not "just saved".
  const [openedAfter, setOpenedAfter] = useState<ReviewFormState>();
  const saved = state.ok === true && state !== openedAfter;
  const open = !saved && (mode === 'pending' || opened);

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            setOpened(true);
            setOpenedAfter(state);
          }}
        >
          <Pencil aria-hidden />
          {mode === 'auto' ? 'Corregir puntaje' : 'Editar revisión'}
        </Button>
        {saved && (
          <p role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
            <CircleCheck aria-hidden className="size-4" />
            Revisión guardada
          </p>
        )}
      </div>
    );
  }

  const errors = state.fieldErrors ?? {};
  return (
    <form
      action={formAction}
      noValidate
      className="grid gap-4 rounded-control border border-line bg-cream p-4"
    >
      {state.message && <Alert>{state.message}</Alert>}
      <Field
        id={`${id}-score`}
        label="Puntaje"
        hint={`De 0 a ${target.pointsText}, con hasta 2 decimales.`}
        errors={errors.score}
      >
        {(control) => (
          <div className="flex items-center gap-2">
            <Input
              {...control}
              name="score"
              inputMode="decimal"
              autoComplete="off"
              defaultValue={state.values?.score ?? initial.score}
              className="max-w-28"
              required
            />
            <span className="text-sm text-ink-soft">de {target.pointsText}</span>
          </div>
        )}
      </Field>
      <Field
        id={`${id}-feedback`}
        label="Comentario para el estudiante (opcional)"
        hint="Lo ve junto a su resultado cuando los resultados están visibles."
        errors={errors.feedback}
      >
        {(control) => (
          <Textarea
            {...control}
            name="feedback"
            maxLength={FEEDBACK_MAX}
            defaultValue={state.values?.feedback ?? initial.feedback}
            className="min-h-20"
          />
        )}
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        {mode !== 'pending' && (
          <Button variant="ghost" onClick={() => setOpened(false)} disabled={pending}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={pending} aria-disabled={pending}>
          {pending ? (
            <>
              <LoaderCircle aria-hidden className="animate-spin" />
              Guardando…
            </>
          ) : (
            'Guardar revisión'
          )}
        </Button>
      </div>
    </form>
  );
}
