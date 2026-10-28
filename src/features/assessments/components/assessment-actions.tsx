'use client';

import { Archive, CopyPlus, Eye } from 'lucide-react';
import Link from 'next/link';
import { useId, useState, useTransition, type ReactNode } from 'react';
import { Alert } from '@/components/ui/alert';
import { AlertDialog, AlertDialogContent, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { archiveAssessmentAction, duplicateAssessmentAction } from '../actions';
import type { AssessmentStatus } from '../contract';

/**
 * Actions of a published or archived assessment. `assign` ("Asignar a un curso", from the assignments feature) is the
 * primary action of a published one; otherwise "Duplicar para editar" is.
 */
export function AssessmentActions({
  assessmentId,
  status,
  assign,
  openAssignments = [],
}: {
  assessmentId: string;
  status: AssessmentStatus;
  assign?: ReactNode;
  /** Assignments not closed yet (scheduled or open): archiving warns about them and offers to close them. */
  openAssignments?: { id: string; workspaceName: string }[];
}) {
  const [duplicateError, setDuplicateError] = useState<string>();
  const [duplicating, startDuplicate] = useTransition();

  function duplicate() {
    startDuplicate(async () => {
      // On success the action opens the copy in the editor.
      const result = await duplicateAssessmentAction(assessmentId);
      if (!result.ok) setDuplicateError(result.message);
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {assign}
        <Button
          variant={assign ? 'secondary' : 'primary'}
          onClick={duplicate}
          disabled={duplicating}
          aria-disabled={duplicating}
        >
          <CopyPlus aria-hidden />
          {duplicating ? 'Duplicando…' : 'Duplicar para editar'}
        </Button>
        <Button variant="secondary" asChild>
          <Link href={`/evaluaciones/${assessmentId}/vista-previa`}>
            <Eye aria-hidden />
            Vista previa
          </Link>
        </Button>
        {status === 'Published' && (
          <ArchiveButton assessmentId={assessmentId} openAssignments={openAssignments} />
        )}
      </div>
      {duplicateError && <Alert>{duplicateError}</Alert>}
    </div>
  );
}

function ArchiveButton({
  assessmentId,
  openAssignments,
}: {
  assessmentId: string;
  openAssignments: { id: string; workspaceName: string }[];
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [closeThem, setCloseThem] = useState(true);
  const [pending, startTransition] = useTransition();
  const count = openAssignments.length;

  function confirm() {
    startTransition(async () => {
      const result = await archiveAssessmentAction(assessmentId, count > 0 && closeThem);
      if (result.ok) setOpen(false);
      else setError(result.message);
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(undefined);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="secondary">
          <Archive aria-hidden />
          Archivar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title="¿Archivar esta evaluación?"
        description="Pasa a Archivadas y ya no se podrá asignar a tus cursos. La puedes seguir viendo y duplicando."
        confirmLabel="Archivar evaluación"
        pendingLabel="Archivando…"
        destructive
        onConfirm={confirm}
        pending={pending}
        error={error && <Alert>{error}</Alert>}
      >
        {count > 0 && (
          <div className="grid gap-3 rounded-control border border-line bg-cream-deep p-4 text-sm">
            <p>
              {count === 1
                ? `Tiene 1 asignación abierta (${openAssignments[0]?.workspaceName}). Archivar no la cierra: los estudiantes pueden seguir respondiendo.`
                : `Tiene ${count} asignaciones abiertas (${openAssignments.map((a) => a.workspaceName).join(', ')}). Archivar no las cierra: los estudiantes pueden seguir respondiendo.`}
            </p>
            <label htmlFor={`${id}-cerrar`} className="flex cursor-pointer items-start gap-3 font-semibold">
              <input
                id={`${id}-cerrar`}
                type="checkbox"
                checked={closeThem}
                onChange={(event) => setCloseThem(event.target.checked)}
                className="mt-0.5 size-4 accent-ink"
              />
              <span>
                {count === 1 ? 'Cerrarla también' : 'Cerrarlas también'}
                <span className="block font-normal text-ink-soft">
                  Las rendiciones en curso se entregan con lo que tengan guardado.
                </span>
              </span>
            </label>
          </div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
