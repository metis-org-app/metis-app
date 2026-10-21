'use client';

import { Archive, ArchiveRestore } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { AlertDialog, AlertDialogContent, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { archiveWorkspaceAction, restoreWorkspaceAction } from '../actions';

/** Archive (active course) or restore (archived course), both behind a confirmation. */
export function ArchiveControls({ workspaceId, archived }: { workspaceId: string; archived: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await (archived ? restoreWorkspaceAction : archiveWorkspaceAction)(workspaceId);
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
          {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
          {archived ? 'Restaurar curso' : 'Archivar curso'}
        </Button>
      </AlertDialogTrigger>
      {archived ? (
        <AlertDialogContent
          title="¿Restaurar este curso?"
          description="Vuelve a tu lista de cursos, el código para unirse funciona de nuevo y puedes sumar estudiantes."
          confirmLabel="Restaurar curso"
          pendingLabel="Restaurando…"
          onConfirm={confirm}
          pending={pending}
          error={error && <Alert>{error}</Alert>}
        />
      ) : (
        <AlertDialogContent
          title="¿Archivar este curso?"
          description="Sale de tu lista de cursos activos, el código para unirse deja de funcionar y no se pueden sumar estudiantes. La nómina se conserva y puedes restaurarlo cuando quieras."
          confirmLabel="Archivar curso"
          pendingLabel="Archivando…"
          onConfirm={confirm}
          pending={pending}
          error={error && <Alert>{error}</Alert>}
        />
      )}
    </AlertDialog>
  );
}
