import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AssessmentActions, AssessmentEditor, AssessmentReadOnly } from '@/features/assessments';
import { getAssessment } from '@/features/assessments/server';
import { AssignDialog, AssignmentList } from '@/features/assignments';
import { getAssignments } from '@/features/assignments/server';
import { requireUser } from '@/features/auth/server';
import { getWorkspaces } from '@/features/workspaces/server';

export async function generateMetadata({ params }: PageProps<'/evaluaciones/[id]'>): Promise<Metadata> {
  const assessment = await getAssessment((await params).id);
  return { title: assessment?.title ?? 'Evaluación' };
}

const BACK = {
  Draft: { label: 'Borradores', param: 'borradores' },
  Published: { label: 'Publicadas', param: 'publicadas' },
  Archived: { label: 'Archivadas', param: 'archivadas' },
} as const;

export default async function AssessmentPage({ params }: PageProps<'/evaluaciones/[id]'>) {
  await requireUser();
  // Another teacher's assessment is a 404 in metis-api, so it looks exactly like one that does not exist.
  const assessment = await getAssessment((await params).id);
  if (!assessment) notFound();

  const draft = assessment.status === 'Draft';
  const published = assessment.status === 'Published';
  const back = BACK[assessment.status];
  // Only a published assessment can be assigned, to an active course; a draft has no assignments.
  const [assignments, courses] = draft
    ? [[], []]
    : await Promise.all([
        getAssignments({ assessmentId: assessment.id }),
        published ? getWorkspaces('Active') : Promise.resolve([]),
      ]);

  return (
    <div className="grid gap-6">
      <header className="grid gap-3">
        <Link
          href={`/evaluaciones?estado=${back.param}`}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-gold-ink underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {back.label}
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="font-display text-4xl font-semibold break-words sm:text-5xl">{assessment.title}</h1>
          <span className="rounded-full border border-line bg-cream-deep px-3 py-1 text-sm font-semibold text-ink-soft">
            {draft ? 'Borrador' : assessment.status === 'Published' ? 'Publicada' : 'Archivada'}
          </span>
        </div>
        {!draft && (
          <p className="max-w-prose text-ink-soft">
            {assessment.status === 'Published'
              ? 'Ya no se puede editar. Para cambiarla, duplícala y edita la copia.'
              : 'Está archivada: no se puede asignar. Puedes duplicarla para usarla de nuevo.'}
          </p>
        )}
      </header>

      {draft ? (
        <AssessmentEditor assessment={assessment} />
      ) : (
        <>
          <AssessmentActions
            assessmentId={assessment.id}
            status={assessment.status}
            openAssignments={assignments
              .filter((assignment) => assignment.availability !== 'Closed')
              .map((assignment) => ({ id: assignment.id, workspaceName: assignment.workspaceName }))}
            assign={
              published && (
                <AssignDialog
                  from={{ kind: 'assessment', id: assessment.id, title: assessment.title }}
                  options={courses.map((course) => ({ id: course.id, label: course.name }))}
                  label="Asignar a un curso"
                  primary
                />
              )
            }
          />
          {(published || assignments.length > 0) && (
            <section aria-labelledby="asignaciones-titulo" className="grid gap-3">
              <h2 id="asignaciones-titulo" className="text-lg font-semibold">
                Asignaciones
              </h2>
              {assignments.length > 0 ? (
                <AssignmentList assignments={assignments} show="workspace" />
              ) : (
                <p className="text-ink-soft">
                  Aún no la asignas. Asígnala a un curso para obtener el link que compartes con tus
                  estudiantes.
                </p>
              )}
            </section>
          )}
          <AssessmentReadOnly assessment={assessment} />
        </>
      )}
    </div>
  );
}
