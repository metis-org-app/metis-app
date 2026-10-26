import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AssignmentSettings,
  AvailabilityBadge,
  availabilityDetail,
  DatedSentence,
  DeleteAssignmentButton,
  OpenCloseButton,
  ResultsVisibilitySwitch,
  StudentLinkCard,
} from '@/features/assignments';
import { getAssignment, studentLinkFor } from '@/features/assignments/server';
import { requireUser } from '@/features/auth/server';
import { RosterSection } from '@/features/submissions';
import { getAssignmentRoster } from '@/features/submissions/server';

export async function generateMetadata({ params }: PageProps<'/asignaciones/[id]'>): Promise<Metadata> {
  const assignment = await getAssignment((await params).id);
  return { title: assignment ? `${assignment.assessmentTitle} · ${assignment.workspaceName}` : 'Asignación' };
}

export default async function AssignmentPage({ params }: PageProps<'/asignaciones/[id]'>) {
  await requireUser();
  // Another teacher's assignment is a 404 in metis-api, so it looks exactly like one that does not exist.
  const assignment = await getAssignment((await params).id);
  if (!assignment) notFound();
  const roster = await getAssignmentRoster(assignment.id);

  return (
    <div className="grid gap-8">
      <header className="grid gap-3">
        <Link
          href={`/cursos/${assignment.workspaceId}`}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-gold-ink underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {assignment.workspaceName}
        </Link>
        <h1 className="font-display text-4xl font-semibold break-words sm:text-5xl">
          {assignment.assessmentTitle}
        </h1>
        <p className="text-ink-soft">
          Asignada a{' '}
          <Link
            href={`/cursos/${assignment.workspaceId}`}
            className="font-semibold text-ink underline-offset-4 hover:underline"
          >
            {assignment.workspaceName}
          </Link>{' '}
          ·{' '}
          <Link
            href={`/evaluaciones/${assignment.assessmentId}`}
            className="font-semibold text-ink underline-offset-4 hover:underline"
          >
            Ver evaluación
          </Link>
        </p>
      </header>

      <section
        aria-labelledby="estado-titulo"
        className="flex flex-wrap items-center justify-between gap-4 rounded-surface border border-line bg-paper p-6 sm:p-7"
      >
        <div className="grid gap-1.5">
          <h2 id="estado-titulo" className="sr-only">
            Estado
          </h2>
          <AvailabilityBadge availability={assignment.availability} className="px-3 py-1 text-sm" />
          <p className="font-semibold">
            <DatedSentence {...availabilityDetail(assignment)} />
          </p>
        </div>
        <OpenCloseButton
          assignmentId={assignment.id}
          availability={assignment.availability}
          hasSubmissions={assignment.submissionCount > 0}
        />
      </section>

      <StudentLinkCard
        assignmentId={assignment.id}
        link={studentLinkFor(assignment.shareToken)}
        title={assignment.assessmentTitle}
        closed={assignment.availability === 'Closed'}
      />

      <section
        aria-labelledby="resultados-titulo"
        className="grid gap-4 rounded-surface border border-line bg-paper p-6 sm:p-7"
      >
        <h2 id="resultados-titulo" className="text-lg font-semibold">
          Resultados
        </h2>
        <ResultsVisibilitySwitch
          key={String(assignment.resultsVisible)}
          assignmentId={assignment.id}
          visible={assignment.resultsVisible}
        />
      </section>

      <RosterSection assignmentId={assignment.id} roster={roster} />

      <AssignmentSettings assignment={assignment} />

      <footer className="border-t border-line pt-6">
        <DeleteAssignmentButton assignmentId={assignment.id} />
      </footer>
    </div>
  );
}
