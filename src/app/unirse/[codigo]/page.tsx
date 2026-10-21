import type { Metadata } from 'next';
import { Logo } from '@/components/brand/logo';
import { JoinForm } from '@/features/workspaces';
import { lookUpJoinCode, type JoinLookup } from '@/features/workspaces/server';

export const metadata: Metadata = { title: 'Unirse a un curso' };

const PROBLEMS: Record<Exclude<JoinLookup['status'], 'found'>, { title: string; body: string }> = {
  'not-found': {
    title: 'Este código no funciona',
    body: 'Puede que tu profe lo haya cambiado o que el curso esté cerrado. Pídele el link nuevo y vuelve a entrar.',
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
 * Public page where students join a course from the link or code their teacher shared. Most of them arrive from a
 * phone, so the layout is a single centered column that works from 360 px up.
 */
export default async function JoinPage({ params }: PageProps<'/unirse/[codigo]'>) {
  const lookup = await lookUpJoinCode((await params).codigo);

  return (
    <div className="min-h-dvh bg-cream px-5 py-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-md gap-8">
        <Logo />
        <main id="contenido" className="grid gap-6 rounded-surface border border-line bg-paper p-6 sm:p-8">
          {lookup.status === 'found' ? (
            <>
              <header className="grid gap-2">
                <p className="text-ink-soft">Te invitaron a unirte a</p>
                <h1 className="font-display text-3xl font-semibold break-words sm:text-4xl">
                  {lookup.info.workspaceName}
                </h1>
                <p className="text-ink-soft">
                  Curso de <span className="font-semibold text-ink">{lookup.info.teacherName}</span>
                </p>
              </header>
              <JoinForm joinCode={lookup.code} />
            </>
          ) : (
            <header role="alert" className="grid gap-2">
              <h1 className="font-display text-3xl font-semibold">{PROBLEMS[lookup.status].title}</h1>
              <p className="text-ink-soft">{PROBLEMS[lookup.status].body}</p>
            </header>
          )}
        </main>
        <p className="text-sm text-ink-soft">
          Metis acompaña a tu curso en sus evaluaciones. Solo usamos tu nombre y email para que tu profe te
          reconozca.
        </p>
      </div>
    </div>
  );
}
