import { Sparkles } from 'lucide-react';
import type { Assessment } from '../contract';
import { formatDate, itemCountLabel, pointsLabel } from '../format';
import { TeacherItem } from './teacher-item';

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
            <TeacherItem item={item} number={item.position} headingId={`item-${item.id}`} />
          </li>
        ))}
      </ol>
    </div>
  );
}
