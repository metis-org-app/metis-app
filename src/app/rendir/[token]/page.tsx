import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import { durationLabel, PublicAssignmentView } from '@/features/assignments';
import { StartForm, SubmissionResult, SubmissionScreen } from '@/features/submissions';
import { loadTakePage, type TakePage } from '@/features/submissions/server';

export const metadata: Metadata = { title: 'Evaluación' };

type Problem = Extract<TakePage['kind'], 'not-found' | 'rate-limited' | 'unavailable'>;

const PROBLEMS: Record<Problem, { title: string; body: string }> = {
  'not-found': {
    title: 'No encontramos esta evaluación',
    body: 'Puede que tu profe haya cambiado el link. Pídele el link nuevo y vuelve a entrar.',
  },
  'rate-limited': {
    title: 'Espera un momento',
    body: 'Hubo demasiados intentos seguidos desde esta conexión. Espera un minuto y vuelve a cargar la página.',
  },
  unavailable: {
    title: 'No pudimos conectar con Metis',
    body: 'Revisa tu conexión y vuelve a cargar la página en unos minutos.',
  },
};

/** The narrow, single-card layout of everything on the link except the submission itself. */
function Card({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-cream px-4 py-8 sm:px-5 sm:py-12">
      <div className="mx-auto grid w-full max-w-xl gap-8">
        <Logo />
        <main id="contenido" className="grid gap-6 rounded-surface border border-line bg-paper p-5 sm:p-8">
          {children}
        </main>
        <p className="text-sm text-ink-soft">
          Metis acompaña a tu curso en sus evaluaciones. Tu profe ve tus respuestas y las preguntas que le
          hagas a Metis.
        </p>
      </div>
    </div>
  );
}

/*
 * Public page of the student link (`/rendir/<shareToken>`), usually opened from a phone by scanning the QR the teacher
 * projects. It needs no account: the student enters with their email, and the access key of their submission stays in
 * an httpOnly cookie of this link (see features/submissions/session.ts), so reloading resumes where they were.
 */
export default async function TakeAssessmentPage({ params }: PageProps<'/rendir/[token]'>) {
  const { token } = await params;
  const page = await loadTakePage(token);

  switch (page.kind) {
    case 'answering':
      return <SubmissionScreen shareToken={token} submission={page.submission} />;
    case 'submitted':
      return (
        <Card>
          <SubmissionResult title={page.title} result={page.result} />
        </Card>
      );
    case 'start':
      return (
        <Card>
          <PublicAssignmentView assignment={page.assignment}>
            <StartForm shareToken={token} durationLabel={durationLabel(page.assignment.durationMinutes)} />
          </PublicAssignmentView>
        </Card>
      );
    default:
      return (
        <Card>
          <header role="alert" className="grid gap-2">
            <h1 className="font-display text-3xl font-semibold">{PROBLEMS[page.kind].title}</h1>
            <p className="text-ink-soft">{PROBLEMS[page.kind].body}</p>
          </header>
        </Card>
      );
  }
}
