'use client';

import { Archive, CopyPlus, Eye } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { AlertDialog, AlertDialogContent, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { archiveAssessmentAction, duplicateAssessmentAction } from '../actions';
import type { AssessmentStatus } from '../contract';

/** Actions of a published or archived assessment. "Duplicar para editar" is the screen's primary action. */
export function AssessmentActions({
  assessmentId,
  status,
}: {
  assessmentId: string;
  status: AssessmentStatus;
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
        <Button onClick={duplicate} disabled={duplicating} aria-disabled={duplicating}>
          <CopyPlus aria-hidden />
          {duplicating ? 'Duplicando…' : 'Duplicar para editar'}
        </Button>
        <Button variant="secondary" asChild>
          <Link href={`/evaluaciones/${assessmentId}/vista-previa`}>
            <Eye aria-hidden />
            Vista previa
          </Link>
        </Button>
        {status === 'Published' && <ArchiveButton assessmentId={assessmentId} />}
      </div>
      {duplicateError && <Alert>{duplicateError}</Alert>}
    </div>
  );
}

function ArchiveButton({ assessmentId }: { assessmentId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await archiveAssessmentAction(assessmentId);
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
      />
    </AlertDialog>
  );
}
