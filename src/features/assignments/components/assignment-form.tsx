'use client';

import { LoaderCircle } from 'lucide-react';
import { startTransition, useActionState, useEffect, useId, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/cn';
import { HELP_LEVELS, type HelpLevel } from '../contract';
import { isoToLocalInput, localInputToIso, toLocalInput } from '../dates';
import {
  DEFAULT_HELP_LEVEL,
  DURATION_MAX,
  DURATION_MIN,
  DURATION_SUGGESTED,
  INSTRUCTIONS_MAX,
  type AssignmentFormState,
} from '../schemas';

export const HELP_LEVEL_COPY: Record<HelpLevel, { title: string; description: string }> = {
  1: {
    title: 'Preguntas que orientan',
    description: 'Metis responde con preguntas que ayudan a pensar el problema.',
  },
  2: { title: 'Pistas', description: 'Además de preguntar, puede dar pistas sobre qué revisar.' },
  3: {
    title: 'Ejemplos parciales',
    description: 'Además, puede mostrar un ejemplo parcial o descartar una alternativa incorrecta.',
  },
};

export type AssignmentChoice = { id: string; label: string };

/** The configuration the form starts from when editing. */
export type AssignmentFormInitial = {
  opensAt: string;
  dueAt: string | null;
  durationMinutes: number;
  assistantEnabled: boolean;
  maxHelpLevel: HelpLevel;
  assistantInstructions: string | null;
};

type AssignmentFormProps = {
  action: (state: AssignmentFormState, formData: FormData) => Promise<AssignmentFormState>;
  submitLabel: string;
  pendingLabel: string;
  /** Creating: the side fixed by the page (an assessment or a course) and the choices for the other side. */
  target?: {
    fixed: { field: 'assessmentId' | 'workspaceId'; id: string };
    choose: { field: 'assessmentId' | 'workspaceId'; label: string; options: AssignmentChoice[] };
  };
  /** Editing: the current configuration. Results visibility is not part of it (it has its own switch). */
  initial?: AssignmentFormInitial;
  onSaved?: () => void;
  /** For tests: the moment the form opens. */
  now?: Date;
};

/** Next full hour from `date`, as a datetime-local value: a sensible start when the teacher picks "a date". */
function nextHour(date: Date, plusHours = 0) {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1 + plusHours);
  return toLocalInput(next);
}

/**
 * Create or edit an assignment. Dates are typed in the teacher's zone and sent as ISO with offset (hidden inputs), so
 * the server action never guesses the zone. Every control is controlled: React resets uncontrolled fields after a
 * form action, and a failed submit must keep what the teacher chose.
 */
export function AssignmentForm({
  action,
  submitLabel,
  pendingLabel,
  target,
  initial,
  onSaved,
  now: nowProp,
}: AssignmentFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [now] = useState(() => nowProp ?? new Date());
  const id = useId();
  const editing = initial !== undefined;

  const [choice, setChoice] = useState('');
  const [opensMode, setOpensMode] = useState<'now' | 'at'>(editing ? 'at' : 'now');
  const [opensLocal, setOpensLocal] = useState(initial ? isoToLocalInput(initial.opensAt) : nextHour(now));
  const [dueMode, setDueMode] = useState<'none' | 'at'>(initial?.dueAt ? 'at' : 'none');
  const [dueLocal, setDueLocal] = useState(
    initial?.dueAt ? isoToLocalInput(initial.dueAt) : nextHour(now, 2),
  );
  const [duration, setDuration] = useState(String(initial?.durationMinutes ?? DURATION_SUGGESTED));
  const [assistantEnabled, setAssistantEnabled] = useState(initial?.assistantEnabled ?? true);
  const [helpLevel, setHelpLevel] = useState(String(initial?.maxHelpLevel ?? DEFAULT_HELP_LEVEL));
  const [instructions, setInstructions] = useState(initial?.assistantInstructions ?? '');
  const [resultsVisible, setResultsVisible] = useState(false);

  useEffect(() => {
    if (state.ok) onSaved?.();
  }, [state, onSaved]);

  const errors = state.fieldErrors ?? {};
  const opensAt = opensMode === 'at' ? (localInputToIso(opensLocal) ?? '') : '';
  const dueAt = dueMode === 'at' ? (localInputToIso(dueLocal) ?? '') : '';

  return (
    <form
      noValidate
      className="grid gap-6"
      // Submitted by hand, not with `action`: a form action resets the form afterwards, which puts the DOM state of
      // controlled radios and switches out of step with React's after a failed submit.
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      {state.message && <Alert>{state.message}</Alert>}

      {target && (
        <>
          <input type="hidden" name={target.fixed.field} value={target.fixed.id} />
          <Field id={`${id}-choice`} label={target.choose.label} errors={errors[target.choose.field]}>
            {(control) => (
              <Select
                {...control}
                name={target.choose.field}
                value={choice}
                onChange={(event) => setChoice(event.target.value)}
                required
              >
                <option value="" disabled>
                  Elige una opción
                </option>
                {target.choose.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </>
      )}

      <WhenFieldset
        legend="Apertura"
        name="opensMode"
        options={[
          { value: 'now', label: 'Ahora' },
          { value: 'at', label: 'En una fecha y hora' },
        ]}
        mode={opensMode}
        onModeChange={(mode) => setOpensMode(mode as 'now' | 'at')}
        dateMode="at"
        dateLabel="Fecha y hora de apertura"
        dateId={`${id}-opens`}
        local={opensLocal}
        onLocalChange={setOpensLocal}
        errors={errors.opensAt}
      />
      <input type="hidden" name="opensAt" value={opensAt} />

      <WhenFieldset
        legend="Cierre"
        name="dueMode"
        options={[
          { value: 'none', label: 'Sin fecha de cierre' },
          { value: 'at', label: 'En una fecha y hora' },
        ]}
        mode={dueMode}
        onModeChange={(mode) => setDueMode(mode as 'none' | 'at')}
        dateMode="at"
        dateLabel="Fecha y hora de cierre"
        dateId={`${id}-due`}
        local={dueLocal}
        onLocalChange={setDueLocal}
        errors={errors.dueAt}
        hint={dueMode === 'none' ? 'Queda abierta hasta que la cierres.' : undefined}
      />
      <input type="hidden" name="dueAt" value={dueAt} />

      <Field
        id={`${id}-duration`}
        label="Duración en minutos"
        hint={`Entre ${DURATION_MIN} y ${DURATION_MAX}. Cada estudiante tiene este tiempo desde que empieza.`}
        errors={errors.durationMinutes}
      >
        {(control) => (
          <Input
            {...control}
            name="durationMinutes"
            type="number"
            inputMode="numeric"
            min={DURATION_MIN}
            max={DURATION_MAX}
            step={1}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className="max-w-40"
            required
          />
        )}
      </Field>

      <section
        aria-labelledby={`${id}-metis`}
        className="grid gap-4 rounded-control border border-line p-4 sm:p-5"
      >
        <h3 id={`${id}-metis`} className="font-semibold">
          Metis
        </h3>
        <SwitchRow
          id={`${id}-assistant`}
          name="assistantEnabled"
          label="Metis puede ayudar en esta evaluación"
          hint="Guía con preguntas y pistas, sin dar la respuesta."
          checked={assistantEnabled}
          onCheckedChange={setAssistantEnabled}
        />
        {assistantEnabled ? (
          <>
            <fieldset
              className="grid gap-2"
              aria-describedby={errors.maxHelpLevel ? `${id}-level-error` : undefined}
            >
              <legend className="mb-1 text-sm font-semibold">Cuánto puede ayudar</legend>
              {HELP_LEVELS.map((level) => (
                <label
                  key={level}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-control border border-line p-3 transition-colors hover:bg-cream-deep',
                    'has-checked:border-ink has-checked:bg-cream-deep has-focus-visible:ring-3 has-focus-visible:ring-gold-soft',
                  )}
                >
                  <input
                    type="radio"
                    name="maxHelpLevel"
                    value={level}
                    checked={helpLevel === String(level)}
                    onChange={() => setHelpLevel(String(level))}
                    className="mt-1 size-4 accent-ink"
                  />
                  <span className="grid gap-0.5">
                    <span className="text-sm font-semibold">
                      {level}. {HELP_LEVEL_COPY[level].title}
                    </span>
                    <span className="text-sm text-ink-soft">{HELP_LEVEL_COPY[level].description}</span>
                  </span>
                </label>
              ))}
              {errors.maxHelpLevel && (
                <p id={`${id}-level-error`} className="text-sm text-danger">
                  {errors.maxHelpLevel.join(' ')}
                </p>
              )}
            </fieldset>
            <Field
              id={`${id}-instructions`}
              label="Indicaciones para Metis (opcional)"
              hint="Por ejemplo: «No muestres ejemplos con números, solo preguntas». Los estudiantes no las ven."
              errors={errors.assistantInstructions}
            >
              {(control) => (
                <Textarea
                  {...control}
                  name="assistantInstructions"
                  maxLength={INSTRUCTIONS_MAX}
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  className="min-h-24"
                />
              )}
            </Field>
          </>
        ) : (
          <>
            {/* Kept while Metis is off, so turning it back on later restores them. */}
            <input type="hidden" name="maxHelpLevel" value={helpLevel} />
            <input type="hidden" name="assistantInstructions" value={instructions} />
          </>
        )}
      </section>

      {!editing && (
        <SwitchRow
          id={`${id}-results`}
          name="resultsVisible"
          label="Los estudiantes ven su resultado al entregar"
          hint="Puedes cambiarlo después, también cuando la asignación ya cerró."
          checked={resultsVisible}
          onCheckedChange={setResultsVisible}
        />
      )}

      <Button type="submit" className="justify-self-end" disabled={pending} aria-disabled={pending}>
        {pending ? (
          <>
            <LoaderCircle aria-hidden className="animate-spin" />
            {pendingLabel}
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}

type WhenFieldsetProps = {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  mode: string;
  onModeChange: (mode: string) => void;
  dateMode: string;
  dateLabel: string;
  dateId: string;
  local: string;
  onLocalChange: (value: string) => void;
  errors?: string[] | undefined;
  hint?: string | undefined;
};

/** "Ahora / En una fecha y hora": two radios, and the date input when the second is chosen. */
function WhenFieldset({
  legend,
  name,
  options,
  mode,
  onModeChange,
  dateMode,
  dateLabel,
  dateId,
  local,
  onLocalChange,
  errors,
  hint,
}: WhenFieldsetProps) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="inline-flex cursor-pointer items-center gap-2 text-[0.9375rem]"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={mode === option.value}
              onChange={() => onModeChange(option.value)}
              className="size-4 accent-ink"
            />
            {option.label}
          </label>
        ))}
      </div>
      {mode === dateMode ? (
        <Field id={dateId} label={dateLabel} errors={errors}>
          {(control) => (
            <Input
              {...control}
              type="datetime-local"
              value={local}
              onChange={(event) => onLocalChange(event.target.value)}
              className="max-w-64"
              required
            />
          )}
        </Field>
      ) : (
        hint && <p className="text-sm text-ink-soft">{hint}</p>
      )}
    </fieldset>
  );
}

type SwitchRowProps = {
  id: string;
  name: string;
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

function SwitchRow({ id, name, label, hint, checked, onCheckedChange }: SwitchRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="grid gap-0.5">
        <label htmlFor={id} className="text-[0.9375rem] font-semibold">
          {label}
        </label>
        <p id={`${id}-hint`} className="text-sm text-ink-soft">
          {hint}
        </p>
      </div>
      <Switch
        id={id}
        name={name}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-describedby={`${id}-hint`}
      />
    </div>
  );
}
