import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { AssessmentItem } from '../contract';
import { pointsLabel } from '../format';
import { ITEM_TYPE_LABELS } from '../item-draft';

/** What the teacher view needs of a question: a saved item, or one of an AI draft (no id or position yet). */
export type TeacherItemView = Omit<AssessmentItem, 'id' | 'position'>;

/**
 * One question as its author sees it: the correct answers marked, the notes and Metis's hint. Used by published and
 * archived assessments and by the review of an AI draft, which adds an action to remove it.
 */
export function TeacherItem({
  item,
  number,
  headingId,
  action,
}: {
  item: TeacherItemView;
  number: number;
  headingId: string;
  action?: ReactNode;
}) {
  return (
    <article
      aria-labelledby={headingId}
      className="grid gap-4 rounded-surface border border-line bg-paper p-5 sm:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="grid min-w-0 flex-1 gap-1">
          <p className="text-sm text-ink-soft">
            {ITEM_TYPE_LABELS[item.type]} · {pointsLabel(item.points)}
          </p>
          <h3 id={headingId} className="text-lg leading-snug font-semibold break-words whitespace-pre-wrap">
            <span className="text-ink-soft">{number}.</span> {item.prompt}
          </h3>
        </div>
        {action}
      </header>

      {item.options && (
        <ul className="grid gap-2">
          {item.options.map((option) => (
            <li
              key={option.key}
              className={cn(
                'flex items-start gap-3 rounded-control border px-4 py-2.5',
                option.isCorrect ? 'border-success bg-success/10' : 'border-line',
              )}
            >
              <span aria-hidden className="w-4 shrink-0 font-semibold text-ink-soft">
                {option.key}
              </span>
              <span className="flex-1 break-words">{option.text}</span>
              {option.isCorrect && (
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-success">
                  <Check aria-hidden className="size-4" />
                  Correcta
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {item.type === 'TrueFalse' && (
        <p>
          Respuesta correcta:{' '}
          <span className="font-semibold text-success">{item.isTrue ? 'Verdadero' : 'Falso'}</span>
        </p>
      )}

      {item.type === 'Essay' && (
        <p className="text-ink-soft">
          {item.minWords && item.maxWords
            ? `Entre ${item.minWords} y ${item.maxWords} palabras.`
            : item.minWords
              ? `Al menos ${item.minWords} palabras.`
              : item.maxWords
                ? `Hasta ${item.maxWords} palabras.`
                : 'Sin límite de palabras.'}{' '}
          La corriges tú.
        </p>
      )}

      <dl className="grid gap-3 border-t border-line pt-4 text-sm">
        {item.teacherNotes && (
          <div className="grid gap-0.5">
            <dt className="font-semibold">Notas para ti</dt>
            <dd className="break-words whitespace-pre-wrap text-ink-soft">{item.teacherNotes}</dd>
          </div>
        )}
        <div className="grid gap-0.5">
          <dt className="font-semibold">Metis</dt>
          <dd className="text-ink-soft">
            {item.assistantEnabled ? 'Puede ayudar en esta pregunta.' : 'No ayuda en esta pregunta.'}
            {item.assistantEnabled && item.studentHint && (
              <span className="mt-1 block break-words whitespace-pre-wrap">Pista: {item.studentHint}</span>
            )}
          </dd>
        </div>
      </dl>
    </article>
  );
}
