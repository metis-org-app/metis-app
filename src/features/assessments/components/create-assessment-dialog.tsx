'use client';

import { Plus } from 'lucide-react';
import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { createAssessmentAction } from '../actions';
import { LIMITS } from '../item-draft';
import type { FormState } from '../schemas';

/** "Nueva evaluación": the primary action of /evaluaciones. Creates the draft and opens the editor. */
export function CreateAssessmentDialog() {
  const [state, formAction] = useActionState<FormState, FormData>(createAssessmentAction, {});

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus aria-hidden />
          Nueva evaluación
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Nueva evaluación"
        description="Ponle un título que tus estudiantes reconozcan. Las preguntas las agregas en el editor."
      >
        <form action={formAction} noValidate className="grid gap-5">
          {state.message && <Alert>{state.message}</Alert>}
          <Field
            id="assessment-title"
            label="Título"
            hint="Por ejemplo, «Prueba de fracciones, 6° A»."
            errors={state.fieldErrors?.title}
          >
            {(control) => (
              <Input
                {...control}
                name="title"
                autoComplete="off"
                required
                maxLength={LIMITS.titleMax}
                defaultValue={state.values?.title}
                key={state.values?.title}
              />
            )}
          </Field>
          {/* Step 4 adds the second way to start here: "Pedirle un borrador a Metis" (topic and materials). */}
          <SubmitButton pendingLabel="Creando…" className="justify-self-end">
            Crear y empezar a editar
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
