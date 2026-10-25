import { CircleCheck, Clock3, MessageSquareText } from 'lucide-react';
import { formatPoints } from '@/features/assessments';
import { cn } from '@/lib/cn';
import { fromApiAnswer } from '../answers';
import type { ResultItem, StudentResult } from '../contract';

const points = (value: number) => (value === 1 ? '1 punto' : `${formatPoints(value)} puntos`);

const percentage = (value: number) => `${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })} %`;

/** The student's answer in words: the option texts, Verdadero/Falso or the text. */
function answerText(item: ResultItem) {
  const answer = fromApiAnswer(item.response);
  if (answer === null) return null;
  if (typeof answer === 'boolean') return answer ? 'Verdadero' : 'Falso';
  const optionText = (key: string) => item.options?.find((option) => option.key === key)?.text ?? key;
  if (Array.isArray(answer)) return answer.map(optionText).join(' · ');
  return item.type === 'Essay' ? answer : optionText(answer);
}

/**
 * After submitting: the confirmation and, when the teacher made results visible, the score and each question with the
 * student's answer, its score and the teacher's comment. Pending essays show as "En revisión" and the total as
 * provisional. Coming back to the link shows this same screen.
 */
export function SubmissionResult({ title, result }: { title: string; result: StudentResult }) {
  const detail = result.result;
  const pending = detail?.items.filter((item) => item.gradingStatus === 'PendingReview').length ?? 0;

  return (
    <div className="grid gap-6">
      <header role="status" className="grid gap-3">
        <CircleCheck aria-hidden className="size-10 text-success" />
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">¡Listo! Entregaste tu evaluación</h1>
        <p className="break-words text-ink-soft">{title}</p>
      </header>

      {detail === null ? (
        <p className="rounded-control border border-line bg-cream-deep p-4">
          Tu profesor todavía no publica los resultados. Cuando lo haga, los verás en este mismo link.
        </p>
      ) : (
        <>
          <section
            aria-labelledby="puntaje-titulo"
            className="grid gap-1 rounded-surface border border-line bg-cream-deep p-5"
          >
            <h2 id="puntaje-titulo" className="text-sm font-semibold text-ink-soft">
              {detail.isProvisional ? 'Puntaje provisional' : 'Tu puntaje'}
            </h2>
            <p className="font-display text-4xl font-semibold">
              {formatPoints(detail.score)}{' '}
              <span className="text-xl text-ink-soft">de {formatPoints(detail.maxScore)}</span>
            </p>
            <p className="font-semibold">{percentage(detail.percentage)} de logro</p>
            {detail.isProvisional && (
              <p className="text-sm text-ink-soft">
                Tu profesor todavía está revisando {pending === 1 ? '1 respuesta' : `${pending} respuestas`}.
                El puntaje puede subir cuando termine.
              </p>
            )}
          </section>

          <ol className="grid gap-4" aria-label="Tus respuestas">
            {detail.items.map((item) => {
              const text = answerText(item);
              const inReview = item.gradingStatus === 'PendingReview';
              return (
                <li key={item.itemId} className="grid gap-3 rounded-surface border border-line bg-paper p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm text-ink-soft">Pregunta {item.position}</p>
                    {inReview ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-sm font-semibold">
                        <Clock3 aria-hidden className="size-4" />
                        En revisión
                      </span>
                    ) : (
                      <span className="text-sm font-semibold">
                        {formatPoints(item.score ?? 0)} de {points(item.points)}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold break-words whitespace-pre-wrap">{item.prompt}</p>
                  <div className="grid gap-1">
                    <p className="text-sm text-ink-soft">Tu respuesta</p>
                    <p
                      className={cn(
                        'break-words whitespace-pre-wrap',
                        text === null && 'text-ink-soft italic',
                      )}
                    >
                      {text ?? 'Sin responder'}
                    </p>
                  </div>
                  {item.feedback && (
                    <div className="flex gap-3 rounded-control border border-line bg-cream p-3 text-sm">
                      <MessageSquareText aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-ink" />
                      <p className="break-words whitespace-pre-wrap">
                        <span className="font-semibold">Comentario de tu profesor: </span>
                        {item.feedback}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
