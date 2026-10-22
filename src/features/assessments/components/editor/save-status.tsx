'use client';

import { Check, CircleAlert, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AutosaveStatus } from '../../use-autosave';

/** "Guardando…", "Guardado" or "No se pudo guardar · Reintentar", announced politely to screen readers. */
export function SaveStatus({ status, onRetry }: { status: AutosaveStatus; onRetry: () => void }) {
  return (
    <div role="status" className="flex min-h-9 items-center gap-1.5 text-sm text-ink-soft">
      {status.state === 'saving' ? (
        <>
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          Guardando…
        </>
      ) : status.state === 'saved' ? (
        <>
          <Check aria-hidden className="size-4 text-success" />
          Guardado
        </>
      ) : status.state === 'pending' ? (
        status.blocked ? (
          <span>Sin guardar: falta completar</span>
        ) : (
          <span>Cambios sin guardar</span>
        )
      ) : (
        <span className="inline-flex flex-wrap items-center gap-x-1.5 font-semibold text-danger">
          <CircleAlert aria-hidden className="size-4" />
          No se pudo guardar
          {Object.keys(status.fieldErrors).length === 0 && (
            <>
              <span aria-hidden>·</span>
              <Button variant="link" className="text-sm text-danger" onClick={onRetry}>
                Reintentar
              </Button>
            </>
          )}
        </span>
      )}
    </div>
  );
}
