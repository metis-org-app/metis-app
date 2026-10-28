import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/features/auth/server';
import { nextPending, SubmissionReview } from '@/features/submissions';
import { getAssignmentRoster, getSubmissionDetail } from '@/features/submissions/server';

type Props = PageProps<'/asignaciones/[id]/rendiciones/[submissionId]'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const submission = await getSubmissionDetail((await params).submissionId);
  return { title: submission ? `${submission.student.name} · ${submission.assessmentTitle}` : 'Rendición' };
}

export default async function SubmissionReviewPage({ params }: Props) {
  await requireUser();
  const { id, submissionId } = await params;
  // Another teacher's submission is a 404 in metis-api; one of another assignment of the same teacher is not this page.
  const submission = await getSubmissionDetail(submissionId);
  if (!submission || submission.assignmentId !== id) notFound();
  const roster = await getAssignmentRoster(id);

  return (
    <div className="grid gap-6">
      <Link
        href={`/asignaciones/${id}#rendiciones`}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-gold-ink underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Rendiciones de la asignación
      </Link>
      <SubmissionReview submission={submission} next={nextPending(roster, submission)} />
    </div>
  );
}
