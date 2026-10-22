'use client';

import type { StudentAssessment as StudentAssessmentData } from '../../contract';
import { formatPoints } from '../../item-draft';
import { StudentQuestion, type StudentAnswer } from './student-question';

type StudentAssessmentProps = {
  assessment: StudentAssessmentData;
  answers: Record<string, StudentAnswer>;
  onAnswer: (itemId: string, answer: StudentAnswer) => void;
  disabled?: boolean;
};

/** The whole assessment as a student sees it. Controlled: whoever renders it decides what happens with the answers. */
export function StudentAssessment({ assessment, answers, onAnswer, disabled }: StudentAssessmentProps) {
  return (
    <div className="grid gap-5">
      <header className="grid gap-2">
        <h1 className="font-display text-3xl font-semibold break-words sm:text-4xl">{assessment.title}</h1>
        <p className="text-ink-soft">
          {assessment.itemCount === 1 ? '1 pregunta' : `${assessment.itemCount} preguntas`} ·{' '}
          {formatPoints(assessment.totalPoints)} puntos
        </p>
        {assessment.instructions && (
          <p className="break-words whitespace-pre-wrap">{assessment.instructions}</p>
        )}
      </header>
      {assessment.items.map((item) => (
        <StudentQuestion
          key={item.id}
          item={item}
          answer={answers[item.id] ?? null}
          onAnswer={(answer) => onAnswer(item.id, answer)}
          {...(disabled !== undefined ? { disabled } : {})}
        />
      ))}
    </div>
  );
}
