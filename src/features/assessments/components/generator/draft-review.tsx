'use client';

import { ArrowDown, ArrowUp, Info, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ReviewDraft } from '../../generator/state';
import { itemCountLabel, pointsLabel } from '../../format';
import { LIMITS } from '../../item-draft';
import { TeacherItem } from '../teacher-item';

// The keys metis-api will assign when the draft is saved: "a", "b", "c"... by position.
const keyAt = (index: number) => String.fromCharCode(97 + index);

// The cards enter one by one as if Metis were placing them on the table; the stagger is capped for long drafts.
const cardDelay = (index: number) => `${Math.min(index, 12) * 130}ms`;

type DraftReviewProps = {
  draft: ReviewDraft;
  saving: boolean;
  saveError?: string | undefined;
  titleError?: string | undefined;
  onTitleChange: (title: string) => void;
  onInstructionsChange: (instructions: string) => void;
  onRemoveItem: (key: string) => void;
  onMoveItem: (key: string, direction: 'up' | 'down') => void;
  onRegenerate: () => void;
  onSave: () => void;
};

/**
 * The draft Metis proposed, before anything is saved: the questions arrive as animated cards, and here the
 * teacher moves them, drops the ones that do not fit and adjusts the title. Nothing is saved until the draft
 * is created.
 */
export function DraftReview({
  draft,
  saving,
  saveError,
  titleError,
  onTitleChange,
  onInstructionsChange,
  onRemoveItem,
  onMoveItem,
  onRegenerate,
  onSave,
}: DraftReviewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  const totalPoints = draft.items.reduce((sum, entry) => sum + entry.item.points, 0);

  return (
    <div className="grid gap-6">
      <header className="grid gap-1.5">
        <h1 ref={headingRef} tabIndex={-1} className="font-display text-3xl font-semibold focus:outline-none">
          Revisa el borrador
        </h1>
        <p className="text-ink-soft">
          Mueve las preguntas, quita las que no te sirvan y ajusta el título. Nada se guarda hasta que crees
          el borrador; después lo sigues editando como cualquier evaluación.
        </p>
      </header>

      {draft.notices.length > 0 && (
        <section
          aria-label="Avisos de Metis"
          className="flex gap-3 rounded-control border border-gold/50 bg-gold-soft/40 px-4 py-3 text-sm"
        >
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-ink" />
          <ul className="grid gap-1">
            {draft.notices.map((notice) => (
              <li key={notice} className="break-words">
                {notice}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-5 rounded-surface border border-line bg-paper p-5 sm:p-7">
        <Field id="draft-title" label="Título" errors={titleError ? [titleError] : undefined}>
          {(control) => (
            <Input
              {...control}
              autoComplete="off"
              maxLength={LIMITS.titleMax}
              value={draft.title}
              onChange={(event) => onTitleChange(event.target.value)}
            />
          )}
        </Field>
        <Field id="draft-instructions" label="Instrucciones" hint="Las ven tus estudiantes antes de empezar.">
          {(control) => (
            <Textarea
              {...control}
              className="min-h-24"
              maxLength={LIMITS.instructionsMax}
              value={draft.instructions}
              onChange={(event) => onInstructionsChange(event.target.value)}
            />
          )}
        </Field>
      </section>

      <section aria-labelledby="draft-items-title" className="grid gap-4">
        <h2 id="draft-items-title" className="flex flex-wrap items-baseline gap-x-3 text-lg font-semibold">
          Preguntas
          <span className="text-sm font-normal text-ink-soft">
            {itemCountLabel(draft.items.length)} · {pointsLabel(totalPoints)}
          </span>
        </h2>

        {draft.items.length > 0 ? (
          <ol className="grid gap-4">
            {draft.items.map((entry, index) => (
              <li key={entry.key} className="animate-card-in" style={{ animationDelay: cardDelay(index) }}>
                <TeacherItem
                  item={{
                    ...entry.item,
                    options:
                      entry.item.options?.map((option, position) => ({ key: keyAt(position), ...option })) ??
                      null,
                  }}
                  number={index + 1}
                  headingId={entry.key}
                  action={
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Subir la pregunta ${index + 1}`}
                        disabled={index === 0}
                        onClick={() => onMoveItem(entry.key, 'up')}
                      >
                        <ArrowUp aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Bajar la pregunta ${index + 1}`}
                        disabled={index === draft.items.length - 1}
                        onClick={() => onMoveItem(entry.key, 'down')}
                      >
                        <ArrowDown aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`Quitar la pregunta ${index + 1} del borrador`}
                        onClick={() => onRemoveItem(entry.key)}
                      >
                        <X aria-hidden />
                        Quitar
                      </Button>
                    </div>
                  }
                />
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-surface border border-line bg-paper p-6 text-ink-soft">
            Quitaste todas las preguntas. Vuelve a generar el borrador para tener otras.
          </p>
        )}
      </section>

      {saveError && <Alert>{saveError}</Alert>}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="secondary" size="lg" onClick={onRegenerate} disabled={saving}>
          Volver a generar
        </Button>
        <Button size="lg" onClick={onSave} disabled={saving || draft.items.length === 0}>
          {saving ? 'Creando…' : 'Crear borrador'}
        </Button>
      </div>
    </div>
  );
}
