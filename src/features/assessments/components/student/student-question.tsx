'use client';

import { Check } from 'lucide-react';
import { useId, type Ref } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/cn';
import type { StudentItem } from '../../contract';
import { formatPoints } from '../../item-draft';

/** The answer to one item, by type: the selected key, the selected keys, true/false, or the text. */
export type StudentAnswer = string | string[] | boolean | null;

type StudentQuestionProps = {
  item: StudentItem;
  answer: StudentAnswer;
  onAnswer: (answer: StudentAnswer) => void;
  disabled?: boolean;
  /** The prompt heading, focusable from code: the submission moves focus to it when the question changes. */
  promptRef?: Ref<HTMLHeadingElement>;
};

/** metis-api's limit for an essay answer. */
const MAX_ESSAY_LENGTH = 20_000;

/** Words separated by whitespace, counted the same way as metis-api, which enforces `maxWords` when saving. */
export function countWords(text: string) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

const pointsLabel = (points: number) => (points === 1 ? '1 punto' : `${formatPoints(points)} puntos`);

/*
 * One question as a student answers it: used by the instructor's preview and, from step 6, by the real submission.
 * Built for phones first: every option is a full-width target at least 48 px tall, and it works from 360 px up.
 * It only renders what the student view of the API carries, so it cannot show an answer key.
 */
export function StudentQuestion({
  item,
  answer,
  onAnswer,
  disabled = false,
  promptRef,
}: StudentQuestionProps) {
  const id = useId();
  const promptId = `${id}-prompt`;

  return (
    <article
      aria-labelledby={promptId}
      className="grid gap-4 rounded-surface border border-line bg-paper p-5 sm:p-6"
    >
      <header className="grid gap-2">
        <p className="text-sm text-ink-soft">
          Pregunta {item.position} · {pointsLabel(item.points)}
        </p>
        <h2
          id={promptId}
          ref={promptRef}
          tabIndex={-1}
          className="text-lg leading-snug font-semibold break-words whitespace-pre-wrap focus:outline-none"
        >
          {item.prompt}
        </h2>
      </header>

      {item.type === 'SingleChoice' || item.type === 'MultipleChoice' ? (
        <ChoiceOptions
          item={item}
          answer={answer}
          onAnswer={onAnswer}
          disabled={disabled}
          promptId={promptId}
        />
      ) : item.type === 'TrueFalse' ? (
        <TrueFalseOptions answer={answer} onAnswer={onAnswer} disabled={disabled} promptId={promptId} />
      ) : (
        <EssayAnswer item={item} answer={answer} onAnswer={onAnswer} disabled={disabled} id={id} />
      )}
    </article>
  );
}

type OptionsProps = Omit<StudentQuestionProps, 'item'> & { promptId: string };

function ChoiceOptions({ item, answer, onAnswer, disabled, promptId }: OptionsProps & { item: StudentItem }) {
  const multiple = item.type === 'MultipleChoice';
  const selected = multiple
    ? Array.isArray(answer)
      ? answer
      : []
    : typeof answer === 'string'
      ? [answer]
      : [];
  const name = `${promptId}-options`;

  return (
    <fieldset className="grid gap-2" aria-labelledby={promptId} disabled={disabled}>
      {multiple && <p className="text-sm text-ink-soft">Marca todas las que correspondan.</p>}
      {(item.options ?? []).map((option) => {
        const checked = selected.includes(option.key);
        return (
          <OptionTarget
            key={option.key}
            type={multiple ? 'checkbox' : 'radio'}
            name={name}
            checked={checked}
            onChange={() =>
              onAnswer(
                multiple
                  ? checked
                    ? selected.filter((key) => key !== option.key)
                    : [...selected, option.key]
                  : option.key,
              )
            }
            label={option.text}
          />
        );
      })}
    </fieldset>
  );
}

function TrueFalseOptions({ answer, onAnswer, disabled, promptId }: OptionsProps) {
  return (
    <fieldset className="grid gap-2 sm:grid-cols-2" aria-labelledby={promptId} disabled={disabled}>
      {[true, false].map((value) => (
        <OptionTarget
          key={String(value)}
          type="radio"
          name={`${promptId}-truefalse`}
          checked={answer === value}
          onChange={() => onAnswer(value)}
          label={value ? 'Verdadero' : 'Falso'}
        />
      ))}
    </fieldset>
  );
}

function OptionTarget({
  type,
  name,
  checked,
  onChange,
  label,
}: {
  type: 'radio' | 'checkbox';
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label
      className={cn(
        'flex min-h-12 cursor-pointer items-center gap-3 rounded-control border px-4 py-3 transition-colors',
        'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gold-ink',
        'has-disabled:cursor-not-allowed has-disabled:opacity-60',
        checked ? 'border-ink bg-cream-deep' : 'border-line bg-paper hover:border-ink-soft',
      )}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          'grid size-6 shrink-0 place-items-center border-2 border-ink-soft',
          type === 'radio' ? 'rounded-full' : 'rounded-md',
          checked && 'border-ink bg-ink text-paper',
        )}
      >
        {checked &&
          (type === 'radio' ? (
            <span className="size-2.5 rounded-full bg-paper" />
          ) : (
            <Check className="size-4" />
          ))}
      </span>
      <span className="break-words">{label}</span>
    </label>
  );
}

function EssayAnswer({
  item,
  answer,
  onAnswer,
  disabled,
  id,
}: Omit<StudentQuestionProps, 'item'> & { item: StudentItem; id: string }) {
  const text = typeof answer === 'string' ? answer : '';
  const words = countWords(text);
  const { minWords, maxWords } = item;
  const range =
    minWords && maxWords
      ? `Entre ${minWords} y ${maxWords} palabras.`
      : minWords
        ? `Al menos ${minWords} palabras.`
        : maxWords
          ? `Hasta ${maxWords} palabras.`
          : null;
  const outOfRange = (minWords !== null && words < minWords) || (maxWords !== null && words > maxWords);
  const overMax = maxWords !== null && words > maxWords;

  return (
    <div className="grid gap-1.5">
      <label htmlFor={`${id}-essay`} className="text-sm font-semibold">
        Tu respuesta
      </label>
      <Textarea
        id={`${id}-essay`}
        value={text}
        onChange={(event) => onAnswer(event.target.value)}
        disabled={disabled}
        maxLength={MAX_ESSAY_LENGTH}
        aria-describedby={`${id}-words${overMax ? ` ${id}-over` : ''}`}
        aria-invalid={overMax || undefined}
        className="min-h-40 text-base"
      />
      <p id={`${id}-words`} className="text-sm text-ink-soft" aria-live="polite">
        {words === 1 ? '1 palabra' : `${words} palabras`}
        {range && (
          <>
            {' · '}
            <span className={cn(words > 0 && outOfRange && 'font-semibold text-ink')}>{range}</span>
          </>
        )}
      </p>
      {overMax && (
        <p id={`${id}-over`} className="text-sm font-semibold text-danger">
          Tu respuesta tiene más de {maxWords} palabras. Acórtala para que se pueda guardar.
        </p>
      )}
    </div>
  );
}
