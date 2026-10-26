'use client';

import { ChevronRight, RotateCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { formatPoints } from '@/features/assessments';
import { LocalDateTime } from '@/features/assignments';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { RosterEntry } from '../../contract';
import {
  countByFilter,
  filterRoster,
  FIRST_PENDING_ANCHOR,
  ROSTER_FILTERS,
  reviewHref,
  reviewTotals,
  scoreLabel,
  type RosterFilter,
} from '../../review';
import { RosterStatusBadge } from './roster-status-badge';

const answersLabel = (count: number) => (count === 1 ? '1 respuesta' : `${count} respuestas`);

/**
 * "Rendiciones" of an assignment: the whole roster of the course with each student's state, score, submission time
 * and answers to review, a filter by state and how much is left to review. It does not update by itself: "Actualizar"
 * reads it again.
 */
export function RosterSection({ assignmentId, roster }: { assignmentId: string; roster: RosterEntry[] }) {
  const id = useId();
  const router = useRouter();
  const [filter, setFilter] = useState<RosterFilter>('all');
  const [refreshing, startRefresh] = useTransition();
  const totals = reviewTotals(roster);
  const visible = filterRoster(roster, filter);
  const firstToReview = roster.find((entry) => entry.pendingReviewCount > 0 && entry.submissionId);

  return (
    <section
      id="rendiciones"
      aria-labelledby={`${id}-titulo`}
      className="grid gap-5 rounded-surface border border-line bg-paper p-6 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${id}-titulo`} className="text-lg font-semibold">
          Rendiciones
        </h2>
        <Button
          variant="ghost"
          onClick={() => startRefresh(() => router.refresh())}
          disabled={refreshing}
          aria-disabled={refreshing}
        >
          <RotateCw aria-hidden className={cn(refreshing && 'animate-spin')} />
          {refreshing ? 'Actualizando…' : 'Actualizar'}
        </Button>
      </div>

      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-cream-deep p-4"
      >
        <p className={cn(totals.answers > 0 ? 'font-semibold' : 'text-ink-soft')}>
          {totals.answers > 0
            ? `Quedan ${answersLabel(totals.answers)} por revisar en ${totals.submissions === 1 ? '1 rendición' : `${totals.submissions} rendiciones`}.`
            : 'No hay respuestas por revisar.'}
        </p>
        {firstToReview?.submissionId && (
          <Button variant="secondary" asChild>
            <Link href={reviewHref(assignmentId, { submissionId: firstToReview.submissionId, itemId: null })}>
              Revisar pendientes
              <ChevronRight aria-hidden />
            </Link>
          </Button>
        )}
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold">Mostrar</legend>
        <div className="flex flex-wrap gap-2">
          {ROSTER_FILTERS.map((option) => (
            <label
              key={option.value}
              className={cn(
                'inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-line px-3.5 text-sm font-semibold transition-colors hover:bg-cream-deep',
                'has-checked:border-ink has-checked:bg-ink has-checked:text-paper has-focus-visible:ring-3 has-focus-visible:ring-gold-soft',
              )}
            >
              <input
                type="radio"
                name={`${id}-filtro`}
                value={option.value}
                checked={filter === option.value}
                onChange={() => setFilter(option.value)}
                className="sr-only"
              />
              {option.label}
              <span className="font-normal opacity-80">{countByFilter(roster, option.value)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {roster.length === 0 ? (
        <p className="text-ink-soft">El curso no tiene estudiantes en la nómina.</p>
      ) : visible.length === 0 ? (
        <p className="text-ink-soft">Ningún estudiante en este estado.</p>
      ) : (
        <ul className="grid gap-2" aria-label="Estudiantes">
          {visible.map((entry) => (
            <RosterRow key={entry.studentId} assignmentId={assignmentId} entry={entry} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RosterRow({ assignmentId, entry }: { assignmentId: string; entry: RosterEntry }) {
  const toReview = entry.pendingReviewCount > 0;
  return (
    <li className="grid gap-3 rounded-control border border-line p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="grid min-w-0 gap-2">
        <div className="min-w-0">
          <p className="font-semibold break-words">{entry.studentName}</p>
          <p className="text-sm break-words text-ink-soft">{entry.studentEmail}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          <RosterStatusBadge status={entry.status} />
          {entry.score !== null && entry.maxScore !== null && (
            <span>
              <span className="font-semibold">{scoreLabel(entry.score, entry.maxScore, formatPoints)}</span>
              {entry.isScoreProvisional && <span className="text-ink-soft"> · provisional</span>}
            </span>
          )}
          {entry.submittedAt && (
            <span className="text-ink-soft">
              Entregó: <LocalDateTime iso={entry.submittedAt} />
            </span>
          )}
          {toReview && (
            <span className="font-semibold text-gold-ink">
              {answersLabel(entry.pendingReviewCount)} por revisar
            </span>
          )}
        </div>
      </div>
      {entry.submissionId && (
        <Button variant="secondary" asChild className="justify-self-start sm:justify-self-end">
          <Link
            href={
              toReview
                ? `/asignaciones/${assignmentId}/rendiciones/${entry.submissionId}#${FIRST_PENDING_ANCHOR}`
                : `/asignaciones/${assignmentId}/rendiciones/${entry.submissionId}`
            }
            aria-label={`${toReview ? 'Revisar' : 'Ver'} la rendición de ${entry.studentName}`}
          >
            {toReview ? 'Revisar' : 'Ver'}
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      )}
    </li>
  );
}
