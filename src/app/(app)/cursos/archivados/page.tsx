import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/features/auth/server';
import { WorkspaceList } from '@/features/workspaces';
import { getWorkspaces } from '@/features/workspaces/server';

export const metadata: Metadata = { title: 'Cursos archivados' };

export default async function ArchivedCoursesPage() {
  await requireUser();
  const workspaces = await getWorkspaces('Archived');

  return (
    <div className="grid gap-8">
      <header className="grid gap-3">
        <Link
          href="/cursos"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-gold-ink underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Cursos
        </Link>
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Cursos archivados</h1>
        <p className="text-ink-soft">
          Conservan su nómina, pero no aceptan estudiantes nuevos. Entra a uno para restaurarlo.
        </p>
      </header>

      {workspaces.length > 0 ? (
        <WorkspaceList workspaces={workspaces} showCode={false} />
      ) : (
        <p className="rounded-surface border border-line bg-paper p-6 text-ink-soft">
          No tienes cursos archivados.
        </p>
      )}
    </div>
  );
}
