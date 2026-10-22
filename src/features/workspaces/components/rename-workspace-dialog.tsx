'use client';

import { Pencil } from 'lucide-react';
import { useActionState, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { renameWorkspaceAction } from '../actions';
import type { FormState } from '../schemas';
import { SubmitButton } from '@/components/ui/submit-button';

export function RenameWorkspaceDialog({ workspaceId, name }: { workspaceId: string; name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="md">
          <Pencil aria-hidden />
          Cambiar nombre
        </Button>
      </DialogTrigger>
      {/* Mounted only while open, so every opening starts from the current name and a clean state. */}
      {open && (
        <DialogContent title="Cambiar nombre del curso">
          <RenameForm workspaceId={workspaceId} name={name} onDone={() => setOpen(false)} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function RenameForm({
  workspaceId,
  name,
  onDone,
}: {
  workspaceId: string;
  name: string;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(async (previous, formData) => {
    const result = await renameWorkspaceAction(workspaceId, previous, formData);
    if (result.ok) onDone();
    return result;
  }, {});

  return (
    <form action={formAction} noValidate className="grid gap-5">
      {state.message && <Alert>{state.message}</Alert>}
      <Field id="rename-workspace" label="Nombre del curso" errors={state.fieldErrors?.name}>
        {(control) => (
          <Input
            {...control}
            name="name"
            autoComplete="off"
            required
            maxLength={200}
            defaultValue={state.values?.name ?? name}
            key={state.values?.name ?? name}
          />
        )}
      </Field>
      <SubmitButton pendingLabel="Guardando…" className="justify-self-end">
        Guardar nombre
      </SubmitButton>
    </form>
  );
}
