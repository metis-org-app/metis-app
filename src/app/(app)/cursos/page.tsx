import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/features/auth/server';
import { CreateWorkspaceDialog, WorkspaceList } from '@/features/workspaces';
import { getWorkspaces } from '@/features/workspaces/server';

export const metadata: Metadata = { title: 'Cursos' };

export default async function CoursesPage() {
  await requireUser();
  const workspaces = await getWorkspaces('Active');

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">Cursos</h1>
          <p className="text-ink-soft">Tus cursos activos y sus estudiantes.</p>
        </div>
        {workspaces.length > 0 && <CreateWorkspaceDialog />}
      </header>

      {workspaces.length > 0 ? (
        <WorkspaceList workspaces={workspaces} />
      ) : (
        <section className="grid max-w-xl justify-items-start gap-4 rounded-surface border border-line bg-paper p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Todavía no tienes cursos</h2>
          <p className="text-ink-soft">
            Un curso es el grupo de estudiantes al que le vas a asignar evaluaciones. Puedes armar la nómina
            tú, pegando una lista, o compartirles un código para que se unan desde su celular.
          </p>
          <CreateWorkspaceDialog />
        </section>
      )}

      <p className="text-sm">
        <Link
          href="/cursos/archivados"
          className="font-semibold text-gold-ink underline-offset-4 hover:underline"
        >
          Ver cursos archivados
        </Link>
      </p>
    </div>
  );
}
