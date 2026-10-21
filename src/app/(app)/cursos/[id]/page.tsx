import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/features/auth/server';
import {
  AddStudentForm,
  addRosterAction,
  ArchiveControls,
  JoinCodeCard,
  PasteRoster,
  RenameWorkspaceDialog,
  RosterTable,
  studentCountLabel,
} from '@/features/workspaces';
import { getWorkspaceWithRoster } from '@/features/workspaces/server';

export async function generateMetadata({ params }: PageProps<'/cursos/[id]'>): Promise<Metadata> {
  const data = await getWorkspaceWithRoster((await params).id);
  return { title: data?.workspace.name ?? 'Curso' };
}

export default async function CoursePage({ params }: PageProps<'/cursos/[id]'>) {
  await requireUser();
  const { id } = await params;
  // Another teacher's course is a 404 in metis-api, so it looks exactly like one that does not exist.
  const data = await getWorkspaceWithRoster(id);
  if (!data) notFound();

  const { workspace, students } = data;
  const archived = workspace.status === 'Archived';

  return (
    <div className="grid gap-10">
      <header className="grid gap-3">
        <Link
          href={archived ? '/cursos/archivados' : '/cursos'}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-gold-ink underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {archived ? 'Cursos archivados' : 'Cursos'}
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="font-display text-4xl font-semibold break-words sm:text-5xl">{workspace.name}</h1>
          {archived && (
            <span className="rounded-full border border-line bg-cream-deep px-3 py-1 text-sm font-semibold text-ink-soft">
              Archivado
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-ink-soft">{studentCountLabel(workspace.studentCount)}</p>
          <RenameWorkspaceDialog workspaceId={workspace.id} name={workspace.name} />
        </div>
      </header>

      {archived && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-surface border border-line bg-cream-deep p-5">
          <p className="max-w-prose text-ink-soft">
            Este curso está archivado: el código no funciona y no se pueden sumar estudiantes. Restáuralo para
            volver a usarlo.
          </p>
          <ArchiveControls workspaceId={workspace.id} archived />
        </section>
      )}

      <JoinCodeCard workspaceId={workspace.id} joinCode={workspace.joinCode} archived={archived} />

      <section
        aria-labelledby="nomina-titulo"
        className="grid gap-6 rounded-surface border border-line bg-paper p-6 sm:p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="nomina-titulo" className="text-lg font-semibold">
            Nómina
          </h2>
          {!archived && <PasteRoster onUpload={addRosterAction.bind(null, workspace.id)} />}
        </div>

        {!archived && <AddStudentForm workspaceId={workspace.id} />}

        {students.length > 0 ? (
          <RosterTable workspaceId={workspace.id} students={students} />
        ) : (
          <p className="text-ink-soft">
            {archived
              ? 'Este curso no tiene estudiantes.'
              : 'Aún no hay estudiantes. Agrégalos aquí, pega una lista o comparte el código para que se unan.'}
          </p>
        )}
      </section>

      {!archived && (
        <footer className="border-t border-line pt-6">
          <ArchiveControls workspaceId={workspace.id} archived={false} />
        </footer>
      )}
    </div>
  );
}
