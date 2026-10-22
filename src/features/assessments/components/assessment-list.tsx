import { ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { AssessmentSummary } from '../contract';
import { formatDate, itemCountLabel, pointsLabel } from '../format';

/** Assessments of one tab, linking to the editor (drafts) or the read-only view. Works in server components. */
export function AssessmentList({ assessments }: { assessments: AssessmentSummary[] }) {
  return (
    <ul className="divide-y divide-line rounded-surface border border-line bg-paper">
      {assessments.map((assessment) => (
        <li key={assessment.id}>
          <Link
            href={`/evaluaciones/${assessment.id}`}
            className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors first:rounded-t-surface last:rounded-b-surface hover:bg-cream-deep sm:px-6"
          >
            <span className="font-semibold break-words group-hover:underline group-hover:underline-offset-4">
              {assessment.title}
            </span>
            <ChevronRight aria-hidden className="row-span-2 size-5 text-ink-soft" />
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
              <span>{itemCountLabel(assessment.itemCount)}</span>
              <span aria-hidden>·</span>
              <span>{pointsLabel(assessment.totalPoints)}</span>
              <span aria-hidden>·</span>
              <span>Editada el {formatDate(assessment.updatedAt)}</span>
              {assessment.generatedWithAi && (
                <span className="inline-flex items-center gap-1 text-gold-ink">
                  <Sparkles aria-hidden className="size-3.5" />
                  Con Metis
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
