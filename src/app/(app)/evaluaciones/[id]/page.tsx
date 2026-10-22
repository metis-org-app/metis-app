import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AssessmentActions, AssessmentEditor, AssessmentReadOnly } from '@/features/assessments';
import { getAssessment } from '@/features/assessments/server';
import { requireUser } from '@/features/auth/server';

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
  const back = BACK[assessment.status];

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
          <AssessmentActions assessmentId={assessment.id} status={assessment.status} />
          <AssessmentReadOnly assessment={assessment} />
        </>
      )}
    </div>
  );
}
