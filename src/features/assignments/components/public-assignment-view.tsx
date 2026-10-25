import { CalendarClock, CircleHelp, Clock, ListChecks, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { durationLabel, itemCountLabel, publicAvailabilityText } from '../availability';
import type { PublicAssignment } from '../contract';
import { DatedSentence } from './local-date-time';

/**
 * What a student sees on the link before starting. Most open it from a phone, often by scanning the QR, so it is one
 * column that reads well from 360 px. `children` (the email entry) shows only while the assignment is open.
 */
export function PublicAssignmentView({
  assignment,
  children,
}: {
  assignment: PublicAssignment;
  children?: ReactNode;
}) {
  const closed = assignment.availability === 'Closed';

  return (
    <>
      <header className="grid gap-2">
        <p className="text-ink-soft">
          {assignment.workspaceName} ·{' '}
          <span className="font-semibold text-ink">{assignment.teacherName}</span>
        </p>
        <h1 className="font-display text-3xl font-semibold break-words sm:text-4xl">
          {assignment.assessmentTitle}
        </h1>
      </header>

      <p
        className={
          closed
            ? 'flex gap-3 rounded-control border border-line bg-cream-deep p-4 font-semibold'
            : 'flex gap-3 rounded-control border border-success/30 bg-paper p-4 font-semibold text-success'
        }
      >
        <CalendarClock aria-hidden className="mt-0.5 size-5 shrink-0" />
        <span>
          <DatedSentence {...publicAvailabilityText(assignment)} />
        </span>
      </p>

      <ul className="grid gap-3 text-[0.9375rem]">
        <li className="flex items-center gap-3">
          <ListChecks aria-hidden className="size-5 shrink-0 text-ink-soft" />
          {itemCountLabel(assignment.itemCount)}
        </li>
        <li className="flex items-center gap-3">
          <Clock aria-hidden className="size-5 shrink-0 text-ink-soft" />
          {durationLabel(assignment.durationMinutes)} para responder desde que empieces
        </li>
        <li className="flex items-center gap-3">
          {assignment.metisAvailable ? (
            <>
              <Sparkles aria-hidden className="size-5 shrink-0 text-gold-ink" />
              Metis te puede ayudar con pistas mientras respondes
            </>
          ) : (
            <>
              <CircleHelp aria-hidden className="size-5 shrink-0 text-ink-soft" />
              Esta evaluación se responde sin ayuda de Metis
            </>
          )}
        </li>
      </ul>

      {assignment.instructions && (
        <section aria-labelledby="instrucciones-titulo" className="grid gap-2">
          <h2 id="instrucciones-titulo" className="font-semibold">
            Instrucciones
          </h2>
          <p className="break-words whitespace-pre-line text-ink-soft">{assignment.instructions}</p>
        </section>
      )}

      {assignment.availability === 'Open' && children}
    </>
  );
}
