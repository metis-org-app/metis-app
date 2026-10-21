'use client';

import { Plus } from 'lucide-react';
import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { createWorkspaceAction } from '../actions';
import type { FormState } from '../schemas';
import { SubmitButton } from './submit-button';

/** "Crear curso": the primary action of /cursos. On success the action navigates to the new course. */
export function CreateWorkspaceDialog({ label = 'Crear curso' }: { label?: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(createWorkspaceAction, {});

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus aria-hidden />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Crear curso"
        description="Ponle el nombre con que lo reconocen tus estudiantes, por ejemplo «Matemática 7° A»."
      >
        <form action={formAction} noValidate className="grid gap-5">
          {state.message && <Alert>{state.message}</Alert>}
          <Field id="workspace-name" label="Nombre del curso" errors={state.fieldErrors?.name}>
            {(control) => (
              <Input
                {...control}
                name="name"
                autoComplete="off"
                required
                maxLength={200}
                defaultValue={state.values?.name}
                key={state.values?.name}
              />
            )}
          </Field>
          <SubmitButton pendingLabel="Creando…" className="justify-self-end">
            Crear curso
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
