import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { createAssessmentFromDraftAction, DraftGenerator } from '@/features/assessments';
import { isAiAvailable } from '@/features/assessments/server';
import { requireUser } from '@/features/auth/server';

export const metadata: Metadata = { title: 'Pedirle un borrador a Metis' };

export default async function GenerateDraftPage() {
  await requireUser();
  const aiAvailable = await isAiAvailable();

  return (
    <div className="grid max-w-3xl gap-6">
      <header className="grid gap-3">
        <Link
          href="/evaluaciones"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-gold-ink underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Evaluaciones
        </Link>
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Pedirle un borrador a Metis</h1>
        <p className="max-w-prose text-ink-soft">
          Cuéntale el tema y, si quieres, súbele tus materiales. Metis propone las preguntas y tú decides
          cuáles quedan antes de guardar.
        </p>
      </header>
      <DraftGenerator aiAvailable={aiAvailable} save={createAssessmentFromDraftAction} />
    </div>
  );
}
