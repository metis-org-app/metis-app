'use client';

import { ArrowLeft, Eye } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { StudentAssessment as StudentAssessmentData } from '../../contract';
import { StudentAssessment } from './student-assessment';
import type { StudentAnswer } from './student-question';

/** The instructor's preview: the student view with working answers that are kept only in this tab. */
export function StudentPreview({ assessment }: { assessment: StudentAssessmentData }) {
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});

  return (
    <div className="grid gap-6">
      <div
        role="note"
        className="sticky top-0 z-20 -mx-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gold/50 bg-gold-soft px-5 py-3"
      >
        <p className="inline-flex items-center gap-2 font-semibold">
          <Eye aria-hidden className="size-4 shrink-0" />
          Vista previa: así la verán tus estudiantes
        </p>
        <Link
          href={`/evaluaciones/${assessment.id}`}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Volver a la evaluación
        </Link>
      </div>

      <StudentAssessment
        assessment={assessment}
        answers={answers}
        onAnswer={(itemId, answer) => setAnswers((previous) => ({ ...previous, [itemId]: answer }))}
      />

      <div className="grid gap-2 border-t border-line pt-6">
        <Button size="lg" disabled className="w-full sm:w-fit">
          Entregar
        </Button>
        <p className="text-sm text-ink-soft">En la vista previa no se guarda ni se entrega nada.</p>
      </div>
    </div>
  );
}
