'use client';

import { Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { createAssessmentAction } from '../actions';
import { LIMITS } from '../item-draft';
import type { FormState } from '../schemas';

/**
 * "Nueva evaluación": the primary action of /evaluaciones. Two ways to start: a blank draft with a title, which opens the
 * editor, or a draft proposed by Metis from a topic and materials (/evaluaciones/nueva/metis).
 */
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
        description="Empieza en blanco o pídele a Metis una propuesta de preguntas."
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
          <SubmitButton pendingLabel="Creando…" className="justify-self-end">
            Crear y empezar a editar
          </SubmitButton>
        </form>
        <div className="grid gap-3 border-t border-line pt-5">
          <p className="text-sm text-ink-soft">
            ¿Prefieres partir de una propuesta? Cuéntale a Metis el tema, súbele tus materiales y revisa las
            preguntas antes de guardarlas.
          </p>
          <Link href="/evaluaciones/nueva/metis" className={buttonVariants({ variant: 'secondary' })}>
            <Sparkles aria-hidden />
            Pedirle un borrador a Metis
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
