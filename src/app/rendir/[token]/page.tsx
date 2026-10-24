import type { Metadata } from 'next';
import { Logo } from '@/components/brand/logo';
import { PublicAssignmentView } from '@/features/assignments';
import { lookUpShareToken, type ShareTokenLookup } from '@/features/assignments/server';

export const metadata: Metadata = { title: 'Evaluación' };

const PROBLEMS: Record<Exclude<ShareTokenLookup['status'], 'found'>, { title: string; body: string }> = {
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

/*
 * Public page of the student link (`/rendir/<shareToken>`), usually opened from a phone by scanning the QR the teacher
 * projects. It needs no account. In step 6 students enter here with their email.
 */
export default async function TakeAssessmentPage({ params }: PageProps<'/rendir/[token]'>) {
  const lookup = await lookUpShareToken((await params).token);

  return (
    <div className="min-h-dvh bg-cream px-4 py-8 sm:px-5 sm:py-12">
      <div className="mx-auto grid w-full max-w-md gap-8">
        <Logo />
        <main id="contenido" className="grid gap-6 rounded-surface border border-line bg-paper p-5 sm:p-8">
          {lookup.status === 'found' ? (
            <PublicAssignmentView assignment={lookup.assignment} />
          ) : (
            <header role="alert" className="grid gap-2">
              <h1 className="font-display text-3xl font-semibold">{PROBLEMS[lookup.status].title}</h1>
              <p className="text-ink-soft">{PROBLEMS[lookup.status].body}</p>
            </header>
          )}
        </main>
        <p className="text-sm text-ink-soft">
          Metis acompaña a tu curso en sus evaluaciones. Tu profe ve tus respuestas y las preguntas que le
          hagas a Metis.
        </p>
      </div>
    </div>
  );
}
