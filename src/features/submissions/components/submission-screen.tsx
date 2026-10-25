'use client';

import { ArrowLeft, ArrowRight, CloudOff, LayoutGrid, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { StudentQuestion, type StudentAnswer } from '@/features/assessments';
import { exceedsWordLimit, fromApiAnswer, isAnswered, toApiAnswer } from '../answers';
import { readSubmission, submitSubmission } from '../client-api';
import type { StudentSubmission, SubmissionItem } from '../contract';
import { useCountdown } from '../use-countdown';
import { useResponseAutosave } from '../use-response-autosave';
import { Countdown } from './countdown';
import { QuestionGrid } from './question-grid';
import { SaveIndicator } from './save-indicator';

type Phase = 'answering' | 'submitting' | 'time-up' | 'time-up-failed';

// In the last seconds every change is saved at once, so it reaches metis-api before the deadline.
const FLUSH_BEFORE_DEADLINE_MS = 5_000;
// When time runs out, how long to wait for the last saves before submitting anyway.
const LAST_SAVE_WAIT_MS = 5_000;

const SUBMIT_ERRORS = {
  offline: 'No pudimos guardar todas tus respuestas. Revisa tu conexión y vuelve a intentarlo.',
  failed: 'No pudimos entregar tu evaluación. Revisa tu conexión y vuelve a intentarlo.',
  blocked: 'Una respuesta supera el máximo de palabras. Acórtala antes de entregar.',
} as const;

function unansweredText(count: number) {
  if (count === 0) return 'Respondiste todas las preguntas.';
  return count === 1
    ? 'Te queda 1 pregunta sin responder: vale 0 puntos si entregas ahora.'
    : `Te quedan ${count} preguntas sin responder: valen 0 puntos si entregas ahora.`;
}

/**
 * The student answering: one question per screen, a fixed header with the time left, the progress and the autosave
 * status, and the grid of questions (a dialog on phones, a side panel on desktop). Answers are saved in groups while
 * the student works; when the time runs out the screen saves what is pending and submits by itself.
 */
export function SubmissionScreen({
  shareToken,
  submission,
}: {
  shareToken: string;
  submission: StudentSubmission;
}) {
  const router = useRouter();
  const items = submission.items;
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>(() =>
    Object.fromEntries(submission.responses.map((entry) => [entry.itemId, fromApiAnswer(entry.response)])),
  );
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('answering');
  const [confirming, setConfirming] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [gridOpen, setGridOpen] = useState(false);
  const [sessionLost, setSessionLost] = useState(false);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const navigated = useRef(false);
  const pickedInDialog = useRef(false);
  const finishing = useRef(false);

  const { remaining, sync, announcement } = useCountdown(submission);
  const { queue, status, online } = useResponseAutosave(shareToken, sync);

  const item = items[index]!;
  const answered = new Set(
    items.filter((entry) => isAnswered(entry, answers[entry.id] ?? null)).map((entry) => entry.id),
  );
  const unanswered = items.length - answered.size;
  const locked = phase !== 'answering' || sessionLost || status.state === 'session';

  function answer(target: SubmissionItem, value: StudentAnswer) {
    if (locked) return;
    setAnswers((previous) => ({ ...previous, [target.id]: value }));
    queue.set(target.id, toApiAnswer(target, value), !exceedsWordLimit(target, value));
  }

  function goTo(next: number) {
    navigated.current = true;
    pickedInDialog.current = gridOpen;
    setIndex(next);
    setGridOpen(false);
  }

  // Focus follows the question, so keyboard and screen reader users land on the new prompt (not on the first load).
  useEffect(() => {
    if (navigated.current) promptRef.current?.focus();
  }, [index]);

  const finish = useCallback(
    async (reason: 'manual' | 'time') => {
      setSubmitError(null);
      setPhase(reason === 'time' ? 'time-up' : 'submitting');
      const saved = await Promise.race([
        queue.drain(),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), LAST_SAVE_WAIT_MS)),
      ]);
      if (!saved && reason === 'manual') {
        setSubmitError(queue.status.state === 'blocked' ? SUBMIT_ERRORS.blocked : SUBMIT_ERRORS.offline);
        setPhase('answering');
        return;
      }
      // When time is up, metis-api submits it anyway on the next read; submitting here only makes it immediate.
      const result = await submitSubmission(shareToken);
      if (result.ok || (!result.ok && result.kind === 'closed')) {
        queue.stop();
        router.refresh();
        return;
      }
      if (!result.ok && result.kind === 'session') {
        setSessionLost(true);
        return;
      }
      if (reason === 'time') {
        setPhase('time-up-failed');
      } else {
        setSubmitError(SUBMIT_ERRORS.failed);
        setPhase('answering');
      }
    },
    [queue, router, shareToken],
  );

  // Time running out: save at once in the last seconds, then submit by itself.
  useEffect(() => {
    if (remaining === null || phase !== 'answering') return;
    if (remaining <= FLUSH_BEFORE_DEADLINE_MS) {
      queue.setDelay(0);
      void queue.flush();
    }
    if (remaining === 0 && !finishing.current) {
      finishing.current = true;
      setConfirming(false);
      void finish('time');
    }
  }, [remaining, phase, queue, finish]);

  // The submission was closed elsewhere (the teacher closed the assignment, or the deadline passed on the server).
  useEffect(() => {
    if (status.state === 'closed') router.refresh();
  }, [status.state, router]);

  // Read again on load and whenever the student comes back to the tab: corrects the clock (or an extended deadline)
  // and notices a submission that is no longer in progress.
  useEffect(() => {
    const resync = async () => {
      const result = await readSubmission(shareToken);
      if (result.ok) {
        sync(result.sync);
        if (result.submission.status !== 'InProgress') router.refresh();
      } else if (result.kind === 'session') {
        setSessionLost(true);
      }
    };
    void resync();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void resync();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [shareToken, sync, router]);

  const grid = <QuestionGrid items={items} answered={answered} current={index} onSelect={goTo} />;
  const progress = `${answered.size} de ${items.length} respondidas`;
  const offlineWithChanges = (!online || status.state === 'offline') && status.unsaved > 0;

  return (
    <div className="min-h-dvh bg-cream">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto grid max-w-5xl gap-2 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate font-semibold">{submission.assessmentTitle}</p>
            <Countdown remaining={remaining} announcement={announcement} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div
                role="progressbar"
                aria-label="Preguntas respondidas"
                aria-valuemin={0}
                aria-valuemax={items.length}
                aria-valuenow={answered.size}
                aria-valuetext={progress}
                className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-cream-deep sm:w-40"
              >
                <div
                  className="h-full rounded-full bg-success transition-[width]"
                  style={{ width: `${(answered.size / items.length) * 100}%` }}
                />
              </div>
              <p className="text-sm whitespace-nowrap text-ink-soft">{progress}</p>
            </div>
            <SaveIndicator status={status} online={online} onRetry={() => void queue.flush()} />
          </div>
        </div>
      </header>

      {offlineWithChanges && (
        <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
          <p className="flex gap-3 rounded-control border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
            <CloudOff aria-hidden className="mt-0.5 size-4 shrink-0" />
            Si se acaba el tiempo antes de que vuelva la conexión, lo que no alcanzó a guardarse podría
            perderse.
          </p>
        </div>
      )}

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
        <main id="contenido" className="grid gap-5">
          {sessionLost || status.state === 'session' ? (
            <Alert>
              Esta evaluación se abrió en otro dispositivo o tu sesión terminó, y desde aquí ya no se puede
              continuar. Vuelve a cargar la página.
            </Alert>
          ) : phase === 'time-up' ? (
            <p
              role="status"
              className="flex items-center gap-3 rounded-control border border-line bg-paper p-4 font-semibold"
            >
              <LoaderCircle aria-hidden className="size-5 shrink-0 animate-spin motion-reduce:animate-none" />
              Se acabó el tiempo. Estamos entregando tu evaluación con tus respuestas guardadas…
            </p>
          ) : phase === 'time-up-failed' ? (
            <div role="alert" className="grid gap-3 rounded-control border border-line bg-paper p-4">
              <p className="font-semibold">Se acabó el tiempo.</p>
              <p className="text-ink-soft">
                Tu evaluación se entrega con las respuestas que alcanzaron a guardarse. Cuando vuelvas a tener
                conexión, recarga la página para ver la confirmación.
              </p>
              <Button variant="secondary" className="w-fit" onClick={() => router.refresh()}>
                Recargar
              </Button>
            </div>
          ) : null}

          <StudentQuestion
            key={item.id}
            item={item}
            answer={answers[item.id] ?? null}
            onAnswer={(value) => answer(item, value)}
            disabled={locked}
            promptRef={promptRef}
          />

          <nav aria-label="Navegación entre preguntas" className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              className="w-full"
            >
              <ArrowLeft aria-hidden />
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => goTo(index + 1)}
              disabled={index === items.length - 1}
              className="w-full"
            >
              Siguiente
              <ArrowRight aria-hidden />
            </Button>
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-3 lg:hidden">
            <Dialog open={gridOpen} onOpenChange={setGridOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="lg">
                  <LayoutGrid aria-hidden />
                  Ver todas las preguntas
                </Button>
              </DialogTrigger>
              <DialogContent
                title="Preguntas"
                description={progress}
                onCloseAutoFocus={(event) => {
                  // Closed by choosing a question: focus goes to its prompt, not back to this button.
                  if (pickedInDialog.current) {
                    pickedInDialog.current = false;
                    event.preventDefault();
                    promptRef.current?.focus();
                  }
                }}
              >
                {grid}
              </DialogContent>
            </Dialog>
          </div>
        </main>

        <aside
          aria-label="Todas las preguntas"
          className="hidden gap-4 rounded-surface border border-line bg-paper p-5 lg:sticky lg:top-28 lg:grid"
        >
          <p className="font-semibold">Preguntas</p>
          {grid}
        </aside>

        <div className="grid gap-2 border-t border-line pt-5 lg:col-start-1">
          {submitError && !confirming && <Alert>{submitError}</Alert>}
          <AlertDialog
            open={confirming}
            onOpenChange={(open) => phase === 'answering' && setConfirming(open)}
          >
            <Button
              size="lg"
              className="w-full sm:w-fit"
              disabled={locked}
              onClick={() => {
                setSubmitError(null);
                setConfirming(true);
              }}
            >
              Entregar
            </Button>
            <AlertDialogContent
              title="¿Entregar tu evaluación?"
              description={`${unansweredText(unanswered)} Después de entregar no podrás cambiar tus respuestas.`}
              confirmLabel="Entregar"
              pending={phase === 'submitting'}
              pendingLabel="Entregando…"
              error={submitError ? <Alert>{submitError}</Alert> : undefined}
              cancelLabel="Seguir respondiendo"
              onConfirm={() => void finish('manual')}
            />
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
