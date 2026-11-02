'use client';

import { ShieldCheck, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { ITEM_TYPES, type ItemType } from '../../contract';
import type { FileProblem } from '../../generator/files';
import { GENERATOR_LIMITS } from '../../generator/limits';
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  type GeneratorFieldErrors,
  type GeneratorValues,
} from '../../generator/values';
import { ITEM_TYPE_LABELS } from '../../item-draft';
import { AttachmentChips, MaterialsMenu } from './materials-field';

type GeneratorFormProps = {
  values: GeneratorValues;
  fieldErrors: GeneratorFieldErrors;
  files: File[];
  fileProblems: FileProblem[];
  rejectedFileName?: string | undefined;
  /** What happened last time (an error or a cancellation), above the prompt. */
  banner?: ReactNode;
  /** The prompt is the screen; the settings fold away under it. */
  settingsOpen: boolean;
  onChange: (values: GeneratorValues) => void;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (file: File) => void;
  onToggleSettings: () => void;
  onSubmit: () => void;
};

const errorsFor = (message: string | undefined) => (message ? [message] : undefined);

/**
 * The start screen of the flow: one prompt where the teacher tells Metis what to create. Materials
 * attach to the prompt like in a chat tool ("Materiales" → files or pasted text, shown as chips), and
 * the fine-tuning ("Ajustes") folds away under it.
 */
export function GeneratorForm({
  values,
  fieldErrors,
  files,
  fileProblems,
  rejectedFileName,
  banner,
  settingsOpen,
  onChange,
  onAddFiles,
  onRemoveFile,
  onToggleSettings,
  onSubmit,
}: GeneratorFormProps) {
  const [dragging, setDragging] = useState(false);
  const set = <K extends keyof GeneratorValues>(key: K, value: GeneratorValues[K]) =>
    onChange({ ...values, [key]: value });

  function toggleType(type: ItemType, checked: boolean) {
    set(
      'allowedTypes',
      checked
        ? ITEM_TYPES.filter((t) => t === type || values.allowedTypes.includes(t))
        : values.allowedTypes.filter((t) => t !== type),
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      {banner}

      <section
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event: DragEvent<HTMLElement>) => {
          event.preventDefault();
          setDragging(false);
          onAddFiles([...event.dataTransfer.files]);
        }}
        className={cn(
          'rounded-surface border transition-colors',
          dragging ? 'border-ink bg-cream/60' : 'border-line bg-paper',
        )}
      >
        <Field
          id="generator-topic"
          label="Tema"
          hint="Cuéntale a Metis qué evaluación quieres crear. Por ejemplo, «La fotosíntesis» o «Fracciones equivalentes»."
          errors={errorsFor(fieldErrors.topic)}
          className="gap-2 p-5 pb-3 sm:p-6 sm:pb-3"
        >
          {(control) => (
            <Textarea
              {...control}
              placeholder="¿Qué evaluación quieres crear?"
              required
              rows={3}
              className="min-h-24 resize-y text-base"
              maxLength={GENERATOR_LIMITS.topicMax}
              value={values.topic}
              onChange={(event) => set('topic', event.target.value)}
            />
          )}
        </Field>

        <AttachmentChips
          files={files}
          problems={fileProblems}
          rejectedFileName={rejectedFileName}
          sourceText={values.sourceText}
          fileError={fieldErrors.files}
          sourceTextError={fieldErrors.sourceText}
          onRemoveFile={onRemoveFile}
          onRemoveSourceText={() => set('sourceText', '')}
        />

        <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-4 sm:px-6">
          <MaterialsMenu
            count={files.length + (values.sourceText.trim() ? 1 : 0)}
            sourceText={values.sourceText}
            onAddFiles={onAddFiles}
            onSourceTextChange={(text) => set('sourceText', text)}
          />
          <Button
            variant="secondary"
            aria-expanded={settingsOpen}
            aria-controls="generator-settings"
            onClick={onToggleSettings}
          >
            <SlidersHorizontal aria-hidden />
            Ajustes
          </Button>
          <Button type="submit" size="lg" className="ml-auto">
            <Sparkles aria-hidden />
            Generar borrador
          </Button>
        </div>
      </section>

      <p className="flex gap-2.5 px-1 text-sm text-ink-soft">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          Tus materiales se envían a nuestro proveedor de IA para generar el borrador y no se guardan. No
          incluyas datos personales de estudiantes.
        </span>
      </p>

      {settingsOpen && (
        <section
          id="generator-settings"
          className="grid gap-5 rounded-surface border border-line bg-paper p-5 sm:p-7"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="generator-level"
              label="Nivel o curso"
              hint="Opcional. Por ejemplo, «2° medio»."
              errors={errorsFor(fieldErrors.level)}
            >
              {(control) => (
                <Input
                  {...control}
                  autoComplete="off"
                  maxLength={GENERATOR_LIMITS.levelMax}
                  value={values.level}
                  onChange={(event) => set('level', event.target.value)}
                />
              )}
            </Field>
            <Field
              id="generator-item-count"
              label="Cantidad de preguntas"
              hint="Entre 1 y 30."
              errors={errorsFor(fieldErrors.itemCount)}
            >
              {(control) => (
                <Input
                  {...control}
                  type="number"
                  inputMode="numeric"
                  min={GENERATOR_LIMITS.itemCountMin}
                  max={GENERATOR_LIMITS.itemCountMax}
                  value={values.itemCount}
                  onChange={(event) => set('itemCount', event.target.value)}
                />
              )}
            </Field>
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-sm font-semibold">Dificultad</legend>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((difficulty) => (
                <label
                  key={difficulty}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm has-checked:border-ink has-checked:bg-cream-deep has-focus-visible:ring-3 has-focus-visible:ring-gold-soft"
                >
                  <input
                    type="radio"
                    name="difficulty"
                    value={difficulty}
                    checked={values.difficulty === difficulty}
                    onChange={() => set('difficulty', difficulty)}
                    className="size-4 accent-ink"
                  />
                  {DIFFICULTY_LABELS[difficulty]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset
            className="grid gap-2"
            aria-describedby={fieldErrors.allowedTypes ? 'generator-types-error' : undefined}
          >
            <legend className="mb-1.5 text-sm font-semibold">Tipos de pregunta</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {ITEM_TYPES.map((type) => (
                <label key={type} className="flex cursor-pointer items-center gap-2.5 text-[0.9375rem]">
                  <input
                    type="checkbox"
                    checked={values.allowedTypes.includes(type)}
                    onChange={(event) => toggleType(type, event.target.checked)}
                    className="size-4 accent-ink"
                  />
                  {ITEM_TYPE_LABELS[type]}
                </label>
              ))}
            </div>
            {fieldErrors.allowedTypes && (
              <p id="generator-types-error" className="text-sm text-danger">
                {fieldErrors.allowedTypes}
              </p>
            )}
          </fieldset>

          <Field
            id="generator-instructions"
            label="Indicaciones adicionales"
            hint="Opcional. Lo que Metis debe tener en cuenta: enfoque, contenidos a evitar, estilo de las preguntas."
            errors={errorsFor(fieldErrors.instructions)}
          >
            {(control) => (
              <Textarea
                {...control}
                className="min-h-24"
                maxLength={GENERATOR_LIMITS.instructionsMax}
                value={values.instructions}
                onChange={(event) => set('instructions', event.target.value)}
              />
            )}
          </Field>
        </section>
      )}
    </form>
  );
}
