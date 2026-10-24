'use client';

import { LockKeyhole, RotateCcw, Trash2 } from 'lucide-react';
import { useId, useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { AlertDialog, AlertDialogContent, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  closeAssignmentAction,
  deleteAssignmentAction,
  reopenAssignmentAction,
  setResultsVisibilityAction,
} from '../actions';
import type { Availability } from '../contract';
import { localInputToIso, toLocalInput } from '../dates';
import { FIELD_COPY } from '../schemas';

/** "Cerrar ahora" while it is scheduled or open; "Reabrir" once it is closed. */
export function OpenCloseButton({
  assignmentId,
  availability,
}: {
  assignmentId: string;
  availability: Availability;
}) {
  return availability === 'Closed' ? (
    <ReopenDialog assignmentId={assignmentId} />
  ) : (
    <CloseButton assignmentId={assignmentId} />
  );
}

function CloseButton({ assignmentId }: { assignmentId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await closeAssignmentAction(assignmentId);
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
          <LockKeyhole aria-hidden />
          Cerrar ahora
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title="¿Cerrar la asignación ahora?"
        description="Nadie más podrá empezar a responder. Puedes reabrirla después."
        confirmLabel="Cerrar asignación"
        pendingLabel="Cerrando…"
        destructive
        onConfirm={confirm}
        pending={pending}
        error={error && <Alert>{error}</Alert>}
      />
    </AlertDialog>
  );
}

/** Reopens with the close date it had (when it is still ahead), without one, or with a new one. */
function ReopenDialog({ assignmentId }: { assignmentId: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [withDate, setWithDate] = useState(false);
  const [local, setLocal] = useState('');
  const [error, setError] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function reopen() {
    const dueAt = withDate ? localInputToIso(local) : null;
    if (withDate && !dueAt) {
      setFieldError(FIELD_COPY.dueAt);
      return;
    }
    startTransition(async () => {
      const result = await reopenAssignmentAction(assignmentId, dueAt);
      if (result.ok) {
        setOpen(false);
      } else if (result.fieldError) {
        setFieldError(result.fieldError);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(23, 59, 0, 0);
          setLocal(toLocalInput(tomorrow));
        } else {
          setError(undefined);
          setFieldError(undefined);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary">
          <RotateCcw aria-hidden />
          Reabrir
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Reabrir asignación"
        description="Los estudiantes podrán volver a entrar con el mismo link. Si la fecha de cierre ya pasó, queda sin fecha de cierre, salvo que elijas una nueva."
      >
        <div className="grid gap-5">
          {error && <Alert>{error}</Alert>}
          <label className="inline-flex cursor-pointer items-center gap-3 text-[0.9375rem]">
            <Switch checked={withDate} onCheckedChange={setWithDate} />
            Elegir una nueva fecha de cierre
          </label>
          {withDate && (
            <Field
              id={`${id}-due`}
              label="Nueva fecha y hora de cierre"
              errors={fieldError ? [fieldError] : undefined}
            >
              {(control) => (
                <Input
                  {...control}
                  type="datetime-local"
                  value={local}
                  onChange={(event) => {
                    setLocal(event.target.value);
                    setFieldError(undefined);
                  }}
                  className="max-w-64"
                />
              )}
            </Field>
          )}
          <Button onClick={reopen} disabled={pending} aria-disabled={pending} className="justify-self-end">
            <RotateCcw aria-hidden />
            {pending ? 'Reabriendo…' : 'Reabrir asignación'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Applies at once, in any state (also closed). The switch moves first and goes back if the change fails. */
export function ResultsVisibilitySwitch({
  assignmentId,
  visible,
}: {
  assignmentId: string;
  visible: boolean;
}) {
  const id = useId();
  const [checked, setChecked] = useState(visible);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function change(next: boolean) {
    setChecked(next);
    setError(undefined);
    startTransition(async () => {
      const result = await setResultsVisibilityAction(assignmentId, next);
      if (!result.ok) {
        setChecked(!next);
        setError(result.message);
      }
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-0.5">
          <label htmlFor={id} className="font-semibold">
            Los estudiantes ven su resultado al entregar
          </label>
          <p id={`${id}-hint`} className="text-sm text-ink-soft">
            {checked
              ? 'Al entregar ven su puntaje y la corrección de cada pregunta, nunca la pauta.'
              : 'Al entregar solo ven que su evaluación fue recibida.'}{' '}
            Puedes cambiarlo cuando quieras.
          </p>
        </div>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={change}
          disabled={pending}
          aria-describedby={`${id}-hint`}
        />
      </div>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}

export function DeleteAssignmentButton({ assignmentId }: { assignmentId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      // On success the action goes back to the course.
      const result = await deleteAssignmentAction(assignmentId);
      if (!result.ok) setError(result.message);
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
        <Button variant="ghost">
          <Trash2 aria-hidden />
          Eliminar asignación
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title="¿Eliminar esta asignación?"
        description="El link deja de funcionar y la asignación desaparece del curso. La evaluación no se borra: puedes volver a asignarla."
        confirmLabel="Eliminar asignación"
        pendingLabel="Eliminando…"
        destructive
        onConfirm={confirm}
        pending={pending}
        error={error && <Alert>{error}</Alert>}
      />
    </AlertDialog>
  );
}
