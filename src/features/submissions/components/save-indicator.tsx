import { Check, CloudOff, LoaderCircle, TriangleAlert } from 'lucide-react';
import type { QueueStatus } from '../response-queue';

type SaveIndicatorProps = { status: QueueStatus; online: boolean; onRetry: () => void };

/**
 * Discreet autosave status next to the timer. "Guardando…" and "Guardado" change constantly, so they are not
 * announced; losing the connection or a failed save is (role="status").
 */
export function SaveIndicator({ status, online, onRetry }: SaveIndicatorProps) {
  const offline = status.state === 'offline' || (!online && status.unsaved > 0);

  if (offline) {
    return (
      <p role="status" className="flex items-center gap-1.5 text-sm font-semibold text-danger">
        <CloudOff aria-hidden className="size-4 shrink-0" />
        Sin conexión: tus respuestas se guardarán al volver la conexión
      </p>
    );
  }

  switch (status.state) {
    case 'saving':
    case 'pending':
      return (
        <p className="flex items-center gap-1.5 text-sm text-ink-soft">
          <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
          Guardando…
        </p>
      );
    case 'retrying':
      return (
        <p role="status" className="flex items-center gap-1.5 text-sm text-ink-soft">
          <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
          No pudimos guardar; lo intentamos de nuevo en unos segundos
        </p>
      );
    case 'invalid':
      return (
        <p
          role="status"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-danger"
        >
          <TriangleAlert aria-hidden className="size-4 shrink-0" />
          No pudimos guardar una respuesta.
          <button type="button" onClick={onRetry} className="min-h-8 underline underline-offset-4">
            Reintentar
          </button>
        </p>
      );
    case 'blocked':
      return (
        <p role="status" className="flex items-center gap-1.5 text-sm font-semibold text-danger">
          <TriangleAlert aria-hidden className="size-4 shrink-0" />
          Una respuesta supera el máximo de palabras y no se guarda
        </p>
      );
    default:
      return (
        <p className="flex items-center gap-1.5 text-sm text-ink-soft">
          <Check aria-hidden className="size-4 shrink-0" />
          Guardado
        </p>
      );
  }
}
