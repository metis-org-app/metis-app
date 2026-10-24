'use client';

import { Send } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { createAssignmentAction } from '../actions';
import { AssignmentForm, type AssignmentChoice } from './assignment-form';

type AssignDialogProps = {
  /** Where it opens from: an assessment (choose a course) or a course (choose a published assessment). */
  from: { kind: 'assessment'; id: string; title: string } | { kind: 'workspace'; id: string; name: string };
  options: AssignmentChoice[];
  label: string;
  /** Only the primary action of a screen uses the gold offset shadow. */
  primary?: boolean;
};

/** "Asignar a un curso" / "Asignar evaluación". On success the action opens the new assignment. */
export function AssignDialog({ from, options, label, primary = false }: AssignDialogProps) {
  const fromAssessment = from.kind === 'assessment';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={primary ? 'primary' : 'secondary'}>
          <Send aria-hidden />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent
        title={fromAssessment ? 'Asignar a un curso' : 'Asignar evaluación'}
        description={
          fromAssessment ? (
            <>
              Elige el curso que va a rendir <strong className="font-semibold text-ink">{from.title}</strong>.
              Después te damos el link para compartir.
            </>
          ) : (
            <>
              Elige una evaluación publicada para{' '}
              <strong className="font-semibold text-ink">{from.name}</strong>. Después te damos el link para
              compartir.
            </>
          )
        }
        className="max-w-xl"
      >
        {options.length > 0 ? (
          <AssignmentForm
            action={createAssignmentAction}
            submitLabel="Asignar"
            pendingLabel="Asignando…"
            target={{
              fixed: { field: fromAssessment ? 'assessmentId' : 'workspaceId', id: from.id },
              choose: fromAssessment
                ? { field: 'workspaceId', label: 'Curso', options }
                : { field: 'assessmentId', label: 'Evaluación', options },
            }}
          />
        ) : (
          <EmptyOptions fromAssessment={fromAssessment} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EmptyOptions({ fromAssessment }: { fromAssessment: boolean }) {
  const { text, href, link } = fromAssessment
    ? { text: 'Aún no tienes cursos activos.', href: '/cursos' as Route, link: 'Ir a Cursos' }
    : {
        text: 'Aún no tienes evaluaciones publicadas. Publica una para poder asignarla.',
        href: '/evaluaciones' as Route,
        link: 'Ir a Evaluaciones',
      };
  return (
    <div className="grid gap-3">
      <p className="text-ink-soft">{text}</p>
      <Link
        href={href}
        className="w-fit text-sm font-semibold text-gold-ink underline-offset-4 hover:underline"
      >
        {link}
      </Link>
    </div>
  );
}
