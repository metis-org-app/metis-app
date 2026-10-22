import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Assessment, AssessmentItem } from '../contract';
import { formatDate, itemCountLabel, pointsLabel } from '../format';
import { ITEM_TYPE_LABELS } from '../item-draft';

/** A published or archived assessment for its author: every item with its correct answers marked. Server component. */
export function AssessmentReadOnly({ assessment }: { assessment: Assessment }) {
  return (
    <div className="grid gap-6">
      <section className="grid gap-3 rounded-surface border border-line bg-paper p-5 sm:p-7">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
          <span>{itemCountLabel(assessment.itemCount)}</span>
          <span aria-hidden>·</span>
          <span>{pointsLabel(assessment.totalPoints)}</span>
          {assessment.publishedAt && (
            <>
              <span aria-hidden>·</span>
              <span>Publicada el {formatDate(assessment.publishedAt)}</span>
            </>
          )}
          {assessment.generatedWithAi && (
            <span className="inline-flex items-center gap-1 text-gold-ink">
              <Sparkles aria-hidden className="size-3.5" />
              Con Metis
            </span>
          )}
        </p>
        {assessment.instructions ? (
          <p className="break-words whitespace-pre-wrap">{assessment.instructions}</p>
        ) : (
          <p className="text-ink-soft">Sin instrucciones.</p>
        )}
      </section>

      <ol className="grid gap-4">
        {assessment.items.map((item) => (
          <li key={item.id}>
            <ReadOnlyItem item={item} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function ReadOnlyItem({ item }: { item: AssessmentItem }) {
  return (
    <article
      aria-labelledby={`item-${item.id}`}
      className="grid gap-4 rounded-surface border border-line bg-paper p-5 sm:p-6"
    >
      <header className="grid gap-1">
        <p className="text-sm text-ink-soft">
          {ITEM_TYPE_LABELS[item.type]} · {pointsLabel(item.points)}
        </p>
        <h3
          id={`item-${item.id}`}
          className="text-lg leading-snug font-semibold break-words whitespace-pre-wrap"
        >
          <span className="text-ink-soft">{item.position}.</span> {item.prompt}
        </h3>
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
