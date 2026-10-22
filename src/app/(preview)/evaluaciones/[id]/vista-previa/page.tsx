import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StudentPreview } from '@/features/assessments';
import { getAssessmentPreview } from '@/features/assessments/server';
import { requireUser } from '@/features/auth/server';

export const metadata: Metadata = { title: 'Vista previa' };

/*
 * Outside the (app) shell on purpose: the teacher sees the page as a student will, without the sidebar. Students
 * mostly answer on their phones, so it is a single column that works from 360 px up.
 */
export default async function PreviewPage({ params }: PageProps<'/evaluaciones/[id]/vista-previa'>) {
  await requireUser();
  const assessment = await getAssessmentPreview((await params).id);
  if (!assessment) notFound();

  return (
    <div className="min-h-dvh bg-cream px-5 pb-12">
      <main id="contenido" className="mx-auto w-full max-w-2xl">
        <StudentPreview assessment={assessment} />
      </main>
    </div>
  );
}
