'use client';

import { ArrowDown, ArrowUp, ChevronRight, Copy, Trash2 } from 'lucide-react';
import { Switch } from 'radix-ui';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { AlertDialog, AlertDialogContent, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/cn';
import { ITEM_TYPES, type ItemType } from '../../contract';
import { changeType, ITEM_TYPE_LABELS, LIMITS, missingFor, type ItemDraft } from '../../item-draft';
import { useAutosave, type AutosaveStatus, type SaveOutcome } from '../../use-autosave';
import { OptionsEditor } from './options-editor';
import { SaveStatus } from './save-status';

export type MoveDirection = 'up' | 'down';

type ItemCardProps = {
  /** Stable key of the card (the item id once saved). */
  cardKey: string;
  number: number;
  total: number;
  draft: ItemDraft;
  /** False for an item created in this session that the server does not have yet. */
  stored: boolean;
  onChange: (draft: ItemDraft) => void;
  save: (draft: ItemDraft) => Promise<SaveOutcome>;
  onStatus: (status: AutosaveStatus) => void;
  onMove: (direction: MoveDirection) => void;
  onDuplicate: () => void;
  /** Resolves with an error message, or nothing when the item was deleted. */
  onDelete: () => Promise<string | undefined>;
  canDuplicate: boolean;
};

/** One item in the editor: its fields, its own autosave status and its actions. */
export function ItemCard(props: ItemCardProps) {
  const { cardKey, number, total, draft, stored, save, onStatus } = props;
  // A new card lists what it needs in a neutral note; problems under each field appear once the teacher edits it.
  const [touched, setTouched] = useState(stored);
  const onChange = (next: ItemDraft) => {
    setTouched(true);
    props.onChange(next);
  };
  const idPrefix = `item-${cardKey}`;
  const problems = useMemo(() => missingFor(draft), [draft]);
  const complete = Object.keys(problems).length === 0;
  const { status, retry } = useAutosave({ value: draft, save, canSave: complete, initiallySaved: stored });

  useEffect(() => onStatus(status), [status, onStatus]);

  const serverErrors = status.state === 'error' ? status.fieldErrors : {};
  // A server error wins over the client check of the same field.
  const fieldProblem = (field: keyof typeof problems | 'teacherNotes' | 'studentHint') =>
    serverErrors[field] ??
    (touched && field in problems ? problems[field as keyof typeof problems] : undefined);

  return (
    <article
      aria-labelledby={`${idPrefix}-title`}
      className="grid gap-5 rounded-surface border border-line bg-paper p-5 sm:p-6"
      data-card={cardKey}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 id={`${idPrefix}-title`} className="text-lg font-semibold">
          Pregunta {number}
          <span className="sr-only"> de {total}</span>
        </h3>
        <SaveStatus status={status} onRetry={retry} />
      </header>

      {status.state === 'error' && status.message && <Alert>{status.message}</Alert>}

      <div className="grid gap-5 sm:grid-cols-[1fr_9rem]">
        <Field id={`${idPrefix}-type`} label="Tipo de pregunta">
          {(control) => (
            <select
              {...control}
              value={draft.type}
              onChange={(event) => onChange(changeType(draft, event.target.value as ItemType))}
              className="h-11 w-full rounded-control border border-line bg-paper px-3 text-[0.9375rem] hover:border-ink-soft/60 focus-visible:border-ink focus-visible:ring-3 focus-visible:ring-gold-soft focus-visible:outline-none"
            >
              {ITEM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ITEM_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id={`${idPrefix}-points`} label="Puntaje" errors={listOf(fieldProblem('points'))}>
          {(control) => (
            <Input
              {...control}
              value={draft.points}
              inputMode="decimal"
              autoComplete="off"
              onChange={(event) => onChange({ ...draft, points: event.target.value })}
            />
          )}
        </Field>
      </div>

      <Field id={`${idPrefix}-prompt`} label="Enunciado" errors={listOf(fieldProblem('prompt'))}>
        {(control) => (
          <Textarea
            {...control}
            value={draft.prompt}
            maxLength={LIMITS.promptMax}
            className="min-h-24"
            placeholder={
              draft.type === 'TrueFalse' ? 'Escribe la afirmación que el estudiante evaluará.' : undefined
            }
            onChange={(event) => onChange({ ...draft, prompt: event.target.value })}
          />
        )}
      </Field>

      <TypeFields idPrefix={idPrefix} draft={draft} onChange={onChange} fieldProblem={fieldProblem} />

      {!complete && (
        <div className="rounded-control border border-line bg-cream px-4 py-3 text-sm">
          <p className="font-semibold">Para guardar esta pregunta falta:</p>
          <ul className="mt-1 list-disc pl-5 text-ink-soft">
            {Object.values(problems).map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      )}

      <NotesSection
        idPrefix={idPrefix}
        draft={draft}
        onChange={onChange}
        problem={fieldProblem('teacherNotes')}
      />
      <MetisSection
        idPrefix={idPrefix}
        draft={draft}
        onChange={onChange}
        problem={fieldProblem('studentHint')}
      />

      <footer className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <Button
          variant="ghost"
          size="icon"
          data-move="up"
          aria-label={`Subir la pregunta ${number}`}
          disabled={number === 1}
          onClick={() => props.onMove('up')}
        >
          <ArrowUp aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          data-move="down"
          aria-label={`Bajar la pregunta ${number}`}
          disabled={number === total}
          onClick={() => props.onMove('down')}
        >
          <ArrowDown aria-hidden />
        </Button>
        <span className="flex-1" />
        <Button variant="ghost" onClick={props.onDuplicate} disabled={!props.canDuplicate}>
          <Copy aria-hidden />
          Duplicar pregunta
        </Button>
        <DeleteItemButton number={number} onDelete={props.onDelete} />
      </footer>
    </article>
  );
}

const listOf = (message: string | undefined) => (message ? [message] : undefined);

type SectionProps = {
  idPrefix: string;
  draft: ItemDraft;
  onChange: (draft: ItemDraft) => void;
};

function TypeFields({
  idPrefix,
  draft,
  onChange,
  fieldProblem,
}: SectionProps & { fieldProblem: (field: 'options' | 'isTrue' | 'words') => string | undefined }) {
  if (draft.type === 'SingleChoice' || draft.type === 'MultipleChoice') {
    return (
      <OptionsEditor
        idPrefix={idPrefix}
        draft={draft}
        onChange={onChange}
        problem={fieldProblem('options')}
      />
    );
  }

  if (draft.type === 'TrueFalse') {
    const problem = fieldProblem('isTrue');
    return (
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold">Respuesta correcta</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {[true, false].map((value) => (
            <label
              key={String(value)}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-3 rounded-control border px-4',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold-ink',
                draft.isTrue === value ? 'border-success bg-success/10 font-semibold' : 'border-line',
              )}
            >
              <input
                type="radio"
                name={`${idPrefix}-truefalse`}
                checked={draft.isTrue === value}
                onChange={() => onChange({ ...draft, isTrue: value })}
                className="size-5 accent-success"
              />
              {value ? 'Verdadero' : 'Falso'}
            </label>
          ))}
        </div>
        {problem && <p className="text-sm text-danger">{problem}</p>}
      </fieldset>
    );
  }

  const problem = fieldProblem('words');
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-semibold">
        Rango de palabras <span className="font-normal text-ink-soft">(opcional)</span>
      </legend>
      <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
        <Field id={`${idPrefix}-min-words`} label="Mínimo">
          {(control) => (
            <Input
              {...control}
              value={draft.minWords}
              inputMode="numeric"
              aria-invalid={problem ? true : undefined}
              onChange={(event) => onChange({ ...draft, minWords: event.target.value })}
            />
          )}
        </Field>
        <Field id={`${idPrefix}-max-words`} label="Máximo">
          {(control) => (
            <Input
              {...control}
              value={draft.maxWords}
              inputMode="numeric"
              aria-invalid={problem ? true : undefined}
              onChange={(event) => onChange({ ...draft, maxWords: event.target.value })}
            />
          )}
        </Field>
      </div>
      {problem && <p className="text-sm text-danger">{problem}</p>}
    </fieldset>
  );
}

function NotesSection({
  idPrefix,
  draft,
  onChange,
  problem,
}: SectionProps & { problem: string | undefined }) {
  return (
    <details
      className="group rounded-control border border-line"
      open={draft.teacherNotes !== '' || undefined}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 font-semibold [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="size-4 shrink-0 transition-transform group-open:rotate-90" />
        <span className="flex flex-wrap items-baseline gap-x-2 py-2">
          <span className="whitespace-nowrap">Notas para ti</span>
          <span className="text-sm font-normal text-ink-soft">(tus estudiantes no las ven)</span>
        </span>
      </summary>
      <div className="px-4 pb-4">
        <Field
          id={`${idPrefix}-notes`}
          label="Notas"
          hint="Por qué es la respuesta, o cómo corregirla."
          errors={listOf(problem)}
        >
          {(control) => (
            <Textarea
              {...control}
              value={draft.teacherNotes}
              maxLength={LIMITS.notesMax}
              className="min-h-20"
              onChange={(event) => onChange({ ...draft, teacherNotes: event.target.value })}
            />
          )}
        </Field>
      </div>
    </details>
  );
}

function MetisSection({
  idPrefix,
  draft,
  onChange,
  problem,
}: SectionProps & { problem: string | undefined }) {
  const switchId = `${idPrefix}-metis`;
  return (
    <section
      aria-labelledby={`${idPrefix}-metis-title`}
      className="grid gap-4 rounded-control bg-cream-deep/60 p-4"
    >
      <h4 id={`${idPrefix}-metis-title`} className="font-semibold">
        Metis
      </h4>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={switchId} className="cursor-pointer">
          Metis puede ayudar en esta pregunta
        </label>
        <Switch.Root
          id={switchId}
          checked={draft.assistantEnabled}
          onCheckedChange={(checked) => onChange({ ...draft, assistantEnabled: checked })}
          className="relative h-7 w-12 shrink-0 rounded-full border-2 border-ink-soft bg-paper transition-colors data-[state=checked]:border-ink data-[state=checked]:bg-ink"
        >
          <Switch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-ink-soft transition-transform data-[state=checked]:translate-x-[1.375rem] data-[state=checked]:bg-gold" />
        </Switch.Root>
      </div>
      {draft.assistantEnabled && (
        <Field
          id={`${idPrefix}-hint`}
          label="Pista para Metis (opcional)"
          hint="Metis la usa para orientar al estudiante sin revelarle la respuesta. El estudiante nunca la ve tal cual."
          errors={listOf(problem)}
        >
          {(control) => (
            <Textarea
              {...control}
              value={draft.studentHint}
              maxLength={LIMITS.hintMax}
              className="min-h-20"
              onChange={(event) => onChange({ ...draft, studentHint: event.target.value })}
            />
          )}
        </Field>
      )}
    </section>
  );
}

function DeleteItemButton({
  number,
  onDelete,
}: {
  number: number;
  onDelete: () => Promise<string | undefined>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const message = await onDelete();
      if (message) setError(message);
      else setOpen(false);
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(undefined);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="ghost">
          <Trash2 aria-hidden />
          Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title={`¿Eliminar la pregunta ${number}?`}
        description="Se borra de esta evaluación junto con sus alternativas, notas y pista. No se puede deshacer."
        confirmLabel="Eliminar pregunta"
        pendingLabel="Eliminando…"
        destructive
        onConfirm={confirm}
        pending={pending}
        error={error && <Alert>{error}</Alert>}
      />
    </AlertDialog>
  );
}
