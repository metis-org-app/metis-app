'use client';

import { MonitorSmartphone } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { AlertDialog, AlertDialogContent, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { allowResumeAction } from '../../actions';

/**
 * "Permitir continuar en otro dispositivo", for a submission in progress. The next time the student enters the link
 * with their email, on any device, they continue this submission; the device they used before stops working. It is
 * a confirmation with `danger` because it invalidates that device's access.
 */
export function AllowResumeButton({
  assignmentId,
  submissionId,
  studentName,
  allowed,
}: {
  assignmentId: string;
  submissionId: string;
  studentName: string;
  allowed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await allowResumeAction(assignmentId, submissionId);
      if (result.ok) setOpen(false);
      else setError(result.message);
    });
  }

  return (
    <section
      aria-labelledby="continuar-titulo"
      className="grid gap-3 rounded-surface border border-line bg-paper p-5 sm:p-6"
    >
      <h2 id="continuar-titulo" className="font-semibold">
        Continuar en otro dispositivo
      </h2>
      {allowed ? (
        <p role="status" className="text-ink-soft">
          Listo: {studentName} puede entrar al link con su email desde otro dispositivo y seguir donde quedó.
          Funciona una sola vez.
        </p>
      ) : (
        <>
          <p className="text-ink-soft">
            Úsalo si {studentName} empezó en un celular o computador que ya no tiene (se le acabó la batería,
            cambió de sala o cerró el navegador privado). Sus respuestas guardadas y su tiempo siguen igual.
          </p>
          <AlertDialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setError(undefined);
            }}
          >
            <AlertDialogTrigger asChild>
              <Button variant="secondary" className="justify-self-start">
                <MonitorSmartphone aria-hidden />
                Permitir continuar en otro dispositivo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              title="¿Permitir que continúe en otro dispositivo?"
              description={`La próxima vez que ${studentName} entre al link con su email, seguirá esta rendición en ese dispositivo. El dispositivo que usaba antes deja de funcionar.`}
              confirmLabel="Permitir continuar"
              pendingLabel="Permitiendo…"
              destructive
              onConfirm={confirm}
              pending={pending}
              error={error && <Alert>{error}</Alert>}
            />
          </AlertDialog>
        </>
      )}
    </section>
  );
}
