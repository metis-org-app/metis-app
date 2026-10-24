'use client';

import { Pencil } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { updateAssignmentAction } from '../actions';
import { durationLabel } from '../availability';
import type { Assignment } from '../contract';
import { AssignmentForm, HELP_LEVEL_COPY } from './assignment-form';
import { LocalDateTime } from './local-date-time';

/** The configuration of the assignment, with "Editar configuración". */
export function AssignmentSettings({ assignment }: { assignment: Assignment }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <section
      aria-labelledby="configuracion-titulo"
      className="grid gap-5 rounded-surface border border-line bg-paper p-6 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="configuracion-titulo" className="text-lg font-semibold">
          Configuración
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary">
              <Pencil aria-hidden />
              Editar configuración
            </Button>
          </DialogTrigger>
          <DialogContent title="Editar configuración" className="max-w-xl">
            <AssignmentForm
              action={updateAssignmentAction.bind(null, assignment.id, assignment.dueAt)}
              submitLabel="Guardar cambios"
              pendingLabel="Guardando…"
              initial={assignment}
              onSaved={close}
            />
          </DialogContent>
        </Dialog>
      </div>

      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Setting term="Apertura">
          <LocalDateTime iso={assignment.opensAt} />
        </Setting>
        <Setting term="Cierre">
          {assignment.dueAt ? <LocalDateTime iso={assignment.dueAt} /> : 'Sin fecha de cierre'}
        </Setting>
        <Setting term="Duración">{durationLabel(assignment.durationMinutes)}</Setting>
        <Setting term="Metis">
          {assignment.assistantEnabled
            ? `Puede ayudar: nivel ${assignment.maxHelpLevel}, ${HELP_LEVEL_COPY[assignment.maxHelpLevel].title.toLowerCase()}`
            : 'No ayuda en esta evaluación'}
        </Setting>
        {assignment.assistantEnabled && assignment.assistantInstructions && (
          <Setting term="Indicaciones para Metis" wide>
            <span className="whitespace-pre-line">{assignment.assistantInstructions}</span>
          </Setting>
        )}
      </dl>
    </section>
  );
}

function Setting({ term, children, wide = false }: { term: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'grid gap-0.5 sm:col-span-2' : 'grid gap-0.5'}>
      <dt className="text-sm text-ink-soft">{term}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}
