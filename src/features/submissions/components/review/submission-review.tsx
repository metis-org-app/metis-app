import { Check, ChevronRight, MessageSquareText } from 'lucide-react';
import Link from 'next/link';
import { countWords, formatPoints, ITEM_TYPE_LABELS, pointsLabel } from '@/features/assessments';
import { LocalDateTime } from '@/features/assignments';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { fromApiAnswer } from '../../answers';
import type { ReviewItem, SubmissionDetail } from '../../contract';
import {
  FIRST_PENDING_ANCHOR,
  questionAnchor,
  reviewHref,
  scoreLabel,
  type ReviewTarget,
} from '../../review';
import { AllowResumeButton } from './allow-resume-button';
import { ReviewForm } from './review-form';
import { RosterStatusBadge } from './roster-status-badge';

const GRADING_LABELS = {
  AutoGraded: 'Corrección automática',
  PendingReview: 'Por revisar',
  Reviewed: 'Revisada por ti',
} as const;

/**
 * One submission for the teacher: each question with the student's answer, the right answer and the result, and the
 * review of open questions (or the correction of an automatic score). "Siguiente pendiente" goes to the next question
 * to review of any student of the assignment.
 */
export function SubmissionReview({
  submission,
  next,
}: {
  submission: SubmissionDetail;
  next: ReviewTarget | null;
}) {
  const inProgress = submission.status === 'InProgress';
  const firstPending = submission.items.find((entry) => entry.result?.gradingStatus === 'PendingReview');

  return (
    <div className="grid gap-6">
      <header className="grid gap-4">
        <div className="grid gap-1">
          <h1 className="font-display text-3xl font-semibold break-words sm:text-4xl">
            {submission.student.name}
          </h1>
          <p className="break-words text-ink-soft">
            {submission.student.email} · {submission.assessmentTitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-surface border border-line bg-paper p-5">
          <div className="grid gap-1.5">
            <RosterStatusBadge status={submission.status} />
            {submission.score !== null && (
              <p className="font-display text-3xl font-semibold">
                {scoreLabel(submission.score, submission.maxScore, formatPoints)}
                <span className="ml-2 font-sans text-base font-normal text-ink-soft">
                  {submission.isScoreProvisional ? 'puntaje provisional' : 'puntos'}
                </span>
              </p>
            )}
            <p className="text-sm text-ink-soft">
              Empezó: <LocalDateTime iso={submission.startedAt} />
              {submission.submittedAt && (
                <>
                  {' '}
                  · Entregó: <LocalDateTime iso={submission.submittedAt} />
                </>
              )}
              {inProgress && (
                <>
                  {' '}
                  · Tiempo hasta: <LocalDateTime iso={submission.deadline} />
                </>
              )}
            </p>
            {submission.pendingReviewCount > 0 && (
              <p className="text-sm font-semibold text-gold-ink">
                {submission.pendingReviewCount === 1
                  ? 'Falta revisar 1 respuesta.'
                  : `Faltan revisar ${submission.pendingReviewCount} respuestas.`}
              </p>
            )}
          </div>
          {next ? (
            <Button variant="secondary" asChild>
              <Link href={reviewHref(submission.assignmentId, next)}>
                Siguiente pendiente
                <ChevronRight aria-hidden />
              </Link>
            </Button>
          ) : (
            !inProgress && (
              <p className="text-sm text-ink-soft">No quedan respuestas por revisar en esta asignación.</p>
            )
          )}
        </div>
      </header>

      {inProgress && (
        <>
          <p className="rounded-control border border-line bg-cream-deep p-4">
            Esta rendición está en curso: ves lo que lleva guardado. Podrás revisarla cuando la entregue o se
            acabe su tiempo.
          </p>
          <AllowResumeButton
            assignmentId={submission.assignmentId}
            submissionId={submission.id}
            studentName={submission.student.name}
            allowed={submission.resumeAllowed}
          />
        </>
      )}

      <ol className="grid gap-4" aria-label="Preguntas">
        {submission.items.map((entry) => (
          <li
            key={entry.item.id}
            id={entry === firstPending ? FIRST_PENDING_ANCHOR : undefined}
            className="scroll-mt-6"
          >
            <ReviewQuestion submission={submission} entry={entry} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function ReviewQuestion({ submission, entry }: { submission: SubmissionDetail; entry: ReviewItem }) {
  const { item, response, result } = entry;
  const answer = fromApiAnswer(response);
  const headingId = questionAnchor(item.id);
  const pointsText = formatPoints(item.points);

  return (
    <article
      aria-labelledby={`${headingId}-titulo`}
      id={headingId}
      className={cn(
        'grid scroll-mt-6 gap-4 rounded-surface border bg-paper p-5 sm:p-6',
        result?.gradingStatus === 'PendingReview' ? 'border-gold' : 'border-line',
      )}
    >
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          <p className="text-sm text-ink-soft">
            Pregunta {item.position} · {ITEM_TYPE_LABELS[item.type]} · {pointsLabel(item.points)}
          </p>
          {result && <ResultTag result={result} pointsText={pointsText} />}
        </div>
        <h2
          id={`${headingId}-titulo`}
          className="text-lg leading-snug font-semibold break-words whitespace-pre-wrap"
        >
          {item.prompt}
        </h2>
      </header>

      {item.options && (
        <ul className="grid gap-2" aria-label="Alternativas">
          {item.options.map((option) => {
            const chosen = Array.isArray(answer) ? answer.includes(option.key) : answer === option.key;
            return (
              <li
                key={option.key}
                className={cn(
                  'flex flex-wrap items-start gap-x-3 gap-y-1 rounded-control border px-4 py-2.5',
                  option.isCorrect
                    ? 'border-success bg-success/10'
                    : chosen
                      ? 'border-danger/40'
                      : 'border-line',
                )}
              >
                <span aria-hidden className="w-4 shrink-0 font-semibold text-ink-soft">
                  {option.key}
                </span>
                <span className="min-w-0 flex-1 break-words">{option.text}</span>
                <span className="flex shrink-0 gap-3 text-sm font-semibold">
                  {chosen && <span className="text-ink">Marcó</span>}
                  {option.isCorrect && (
                    <span className="inline-flex items-center gap-1 text-success">
                      <Check aria-hidden className="size-4" />
                      Correcta
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {item.type === 'TrueFalse' && (
        <dl className="grid gap-1 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-ink-soft">Su respuesta</dt>
            <dd className={cn('font-semibold', answer === null && 'font-normal text-ink-soft italic')}>
              {answer === null ? 'Sin responder' : answer ? 'Verdadero' : 'Falso'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">Respuesta correcta</dt>
            <dd className="font-semibold text-success">{item.isTrue ? 'Verdadero' : 'Falso'}</dd>
          </div>
        </dl>
      )}

      {item.options && answer === null && <p className="text-ink-soft italic">Sin responder</p>}

      {item.type === 'Essay' && (
        <div className="grid gap-1">
          <p className="text-sm text-ink-soft">
            Su respuesta
            {typeof answer === 'string' &&
              ` · ${countWords(answer)} ${countWords(answer) === 1 ? 'palabra' : 'palabras'}`}
            {item.maxWords && ` (máximo ${item.maxWords})`}
          </p>
          {typeof answer === 'string' ? (
            <p className="rounded-control border border-line bg-cream p-4 break-words whitespace-pre-wrap">
              {answer}
            </p>
          ) : (
            <p className="text-ink-soft italic">Sin responder</p>
          )}
        </div>
      )}

      {item.teacherNotes && (
        <div className="grid gap-0.5 border-t border-line pt-4 text-sm">
          <p className="font-semibold">Notas para ti</p>
          <p className="break-words whitespace-pre-wrap text-ink-soft">{item.teacherNotes}</p>
        </div>
      )}

      {result?.feedback && (
        <div className="flex gap-3 rounded-control border border-line bg-cream p-3 text-sm">
          <MessageSquareText aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-ink" />
          <p className="break-words whitespace-pre-wrap">
            <span className="font-semibold">Tu comentario: </span>
            {result.feedback}
          </p>
        </div>
      )}

      {result && (
        <ReviewForm
          target={{
            assignmentId: submission.assignmentId,
            submissionId: submission.id,
            itemId: item.id,
            points: item.points,
            pointsText,
          }}
          mode={
            result.gradingStatus === 'PendingReview'
              ? 'pending'
              : result.gradingStatus === 'AutoGraded'
                ? 'auto'
                : 'reviewed'
          }
          initial={{
            score: result.score === null ? '' : formatPoints(result.score),
            feedback: result.feedback ?? '',
          }}
        />
      )}
    </article>
  );
}

/** How the question was graded, and its score once there is one. */
function ResultTag({
  result,
  pointsText,
}: {
  result: NonNullable<ReviewItem['result']>;
  pointsText: string;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-sm">
      <span
        className={cn(
          'rounded-full px-2.5 py-0.5 font-semibold',
          result.gradingStatus === 'PendingReview' ? 'bg-gold-soft text-ink' : 'bg-cream-deep text-ink-soft',
        )}
      >
        {GRADING_LABELS[result.gradingStatus]}
      </span>
      {result.score !== null && (
        <span className="font-semibold">
          {formatPoints(result.score)} de {pointsText}
        </span>
      )}
    </span>
  );
}
