'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import {
  addOption,
  canAddOption,
  canRemoveOption,
  LIMITS,
  markCorrect,
  removeOption,
  setOptionText,
  type ItemDraft,
} from '../../item-draft';

const letter = (index: number) => String.fromCharCode(97 + index);

/**
 * Options of a choice item. Single choice marks the correct one with a radio; multiple choice with checkboxes.
 * Letters follow the position, as the keys metis-api assigns when saving.
 */
export function OptionsEditor({
  idPrefix,
  draft,
  onChange,
  problem,
}: {
  idPrefix: string;
  draft: ItemDraft;
  onChange: (draft: ItemDraft) => void;
  problem?: string | undefined;
}) {
  const single = draft.type === 'SingleChoice';
  const legendId = `${idPrefix}-options-legend`;
  const problemId = `${idPrefix}-options-problem`;

  return (
    <fieldset className="grid gap-3" aria-describedby={problem ? problemId : undefined}>
      <legend id={legendId} className="mb-1 text-sm font-semibold">
        Alternativas
        <span className="ml-2 font-normal text-ink-soft">
          {single ? 'Marca la correcta.' : 'Marca todas las correctas.'}
        </span>
      </legend>

      <ol className="grid gap-2">
        {draft.options.map((option, index) => (
          <li key={option.id} className="flex items-center gap-2">
            <label
              className={cn(
                'grid size-11 shrink-0 cursor-pointer place-items-center rounded-control border transition-colors',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold-ink',
                option.isCorrect ? 'border-success bg-success/10' : 'border-line hover:border-ink-soft',
              )}
            >
              <input
                type={single ? 'radio' : 'checkbox'}
                name={`${idPrefix}-correct`}
                checked={option.isCorrect}
                onChange={(event) => onChange(markCorrect(draft, option.id, event.target.checked))}
                aria-label={`Alternativa ${letter(index)} es correcta`}
                className="size-5 accent-success"
              />
            </label>
            <span aria-hidden className="w-4 shrink-0 text-center font-semibold text-ink-soft">
              {letter(index)}
            </span>
            <Input
              value={option.text}
              maxLength={LIMITS.optionMax}
              aria-label={`Texto de la alternativa ${letter(index)}`}
              aria-invalid={problem ? true : undefined}
              onChange={(event) => onChange(setOptionText(draft, option.id, event.target.value))}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Quitar la alternativa ${letter(index)}`}
              disabled={!canRemoveOption(draft)}
              onClick={() => onChange(removeOption(draft, option.id))}
            >
              <X aria-hidden />
            </Button>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button
          variant="secondary"
          disabled={!canAddOption(draft)}
          onClick={() => onChange(addOption(draft))}
          className="w-fit"
        >
          <Plus aria-hidden />
          Agregar alternativa
        </Button>
        <span className="text-sm text-ink-soft">
          {canAddOption(draft)
            ? `Entre 2 y ${LIMITS.maxOptions} alternativas.`
            : `Máximo ${LIMITS.maxOptions} alternativas.`}
        </span>
      </div>

      {problem && (
        <p id={problemId} className="text-sm text-danger">
          {problem}
        </p>
      )}
    </fieldset>
  );
}
