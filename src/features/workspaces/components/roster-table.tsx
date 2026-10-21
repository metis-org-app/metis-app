'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useActionState, useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { AlertDialog, AlertDialogContent, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { removeStudentAction, updateStudentAction } from '../actions';
import type { FormState } from '../schemas';
import { StudentFields } from './student-fields';
import { SubmitButton } from './submit-button';

type Student = { id: string; name: string; email: string };

export function RosterTable({ workspaceId, students }: { workspaceId: string; students: Student[] }) {
  return (
    <table className="w-full text-left">
      <caption className="sr-only">Nómina del curso</caption>
      <thead className="border-b border-line text-sm text-ink-soft max-sm:sr-only">
        <tr>
          <th scope="col" className="py-2 pr-4 font-semibold">
            Nombre
          </th>
          <th scope="col" className="py-2 pr-4 font-semibold">
            Email
          </th>
          <th scope="col" className="w-0 py-2">
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {students.map((student) => (
          <tr key={student.id} className="align-middle">
            <td className="py-3 pr-4">
              <span className="font-semibold">{student.name}</span>
              {/* On phones the email goes under the name instead of a third column. */}
              <span className="block text-sm break-all text-ink-soft sm:hidden">{student.email}</span>
            </td>
            <td className="hidden py-3 pr-4 break-all text-ink-soft sm:table-cell">{student.email}</td>
            <td className="py-2">
              <div className="flex justify-end gap-1">
                <EditStudentDialog workspaceId={workspaceId} student={student} />
                <RemoveStudentDialog workspaceId={workspaceId} student={student} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EditStudentDialog({ workspaceId, student }: { workspaceId: string; student: Student }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Editar a ${student.name}`}>
          <Pencil aria-hidden />
        </Button>
      </DialogTrigger>
      {open && (
        <DialogContent title="Editar estudiante">
          <EditStudentForm workspaceId={workspaceId} student={student} onDone={() => setOpen(false)} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function EditStudentForm({
  workspaceId,
  student,
  onDone,
}: {
  workspaceId: string;
  student: Student;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(async (previous, formData) => {
    const result = await updateStudentAction(workspaceId, student.id, previous, formData);
    if (result.ok) onDone();
    return result;
  }, {});

  return (
    <form action={formAction} noValidate className="grid gap-5">
      {state.message && <Alert>{state.message}</Alert>}
      <StudentFields idPrefix={`edit-${student.id}`} state={state} defaults={student} />
      <SubmitButton pendingLabel="Guardando…" className="justify-self-end">
        Guardar cambios
      </SubmitButton>
    </form>
  );
}

function RemoveStudentDialog({ workspaceId, student }: { workspaceId: string; student: Student }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await removeStudentAction(workspaceId, student.id);
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
        <Button variant="ghost" size="icon" aria-label={`Quitar a ${student.name}`}>
          <Trash2 aria-hidden />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title={`¿Quitar a ${student.name}?`}
        description="Sale de la nómina de este curso. Si se equivocaron, puede volver a unirse con el código o puedes agregarlo de nuevo."
        confirmLabel="Quitar del curso"
        pendingLabel="Quitando…"
        onConfirm={confirm}
        pending={pending}
        error={error && <Alert>{error}</Alert>}
      />
    </AlertDialog>
  );
}
