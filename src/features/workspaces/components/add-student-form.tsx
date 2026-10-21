'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { addStudentAction } from '../actions';
import type { FormState } from '../schemas';
import { StudentFields } from './student-fields';
import { SubmitButton } from './submit-button';

/** Inline form to add one student. The primary action of the course page. */
export function AddStudentForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    (previous, formData) => addStudentAction(workspaceId, previous, formData),
    {},
  );

  return (
    <form action={formAction} noValidate className="grid gap-4" aria-label="Agregar estudiante">
      {state.message && !state.ok && <Alert>{state.message}</Alert>}
      {/* A successful add returns no values, so the inputs remount empty for the next student. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StudentFields idPrefix="add-student" state={state} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton pendingLabel="Agregando…">Agregar estudiante</SubmitButton>
        <p role="status" className="text-sm text-success">
          {state.ok ? state.message : ''}
        </p>
      </div>
    </form>
  );
}
