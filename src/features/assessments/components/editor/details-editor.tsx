'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { editorApi } from '../../client-api';
import { LIMITS } from '../../item-draft';
import { detailsSchema } from '../../schemas';
import { useAutosave, type AutosaveStatus } from '../../use-autosave';
import { SaveStatus } from './save-status';

type Details = { title: string; instructions: string };

/** Title and instructions of the draft, autosaved like the items. */
export function DetailsEditor({
  assessmentId,
  initial,
  onStatus,
}: {
  assessmentId: string;
  initial: Details;
  onStatus: (status: AutosaveStatus) => void;
}) {
  const [details, setDetails] = useState(initial);
  const parsed = useMemo(() => detailsSchema.safeParse(details), [details]);

  const save = useCallback(
    async (value: Details) => {
      const result = await editorApi.updateDetails(assessmentId, detailsSchema.parse(value));
      return result.ok ? { ok: true as const } : result;
    },
    [assessmentId],
  );
  const { status, retry } = useAutosave({ value: details, save, canSave: parsed.success });

  useEffect(() => onStatus(status), [status, onStatus]);

  const clientErrors: Partial<Record<keyof Details, string[]>> = parsed.success
    ? {}
    : z.flattenError(parsed.error).fieldErrors;
  const serverErrors = status.state === 'error' ? status.fieldErrors : {};
  const errorsFor = (field: keyof Details) =>
    serverErrors[field]
      ? [serverErrors[field]]
      : field === 'title'
        ? clientErrors.title
        : clientErrors.instructions;

  return (
    <section
      aria-label="Datos de la evaluación"
      className="grid gap-5 rounded-surface border border-line bg-paper p-5 sm:p-7"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Datos de la evaluación</h2>
        <SaveStatus status={status} onRetry={retry} />
      </div>
      {status.state === 'error' && status.message && <Alert>{status.message}</Alert>}
      <Field id="details-title" label="Título" errors={errorsFor('title')}>
        {(control) => (
          <Input
            {...control}
            value={details.title}
            maxLength={LIMITS.titleMax}
            autoComplete="off"
            onChange={(event) => setDetails({ ...details, title: event.target.value })}
          />
        )}
      </Field>
      <Field
        id="details-instructions"
        label="Instrucciones (opcional)"
        hint="Tus estudiantes las leen antes de empezar."
        errors={errorsFor('instructions')}
      >
        {(control) => (
          <Textarea
            {...control}
            value={details.instructions}
            maxLength={LIMITS.instructionsMax}
            className="min-h-24"
            onChange={(event) => setDetails({ ...details, instructions: event.target.value })}
          />
        )}
      </Field>
    </section>
  );
}
