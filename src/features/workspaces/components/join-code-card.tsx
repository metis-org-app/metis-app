'use client';

import { Check, Copy, Link2, RefreshCw } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { AlertDialog, AlertDialogContent, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { regenerateJoinCodeAction } from '../actions';

type Copied = 'code' | 'link' | null;

/** `link` is built on the server from APP_URL (`joinLinkFor`), so "Copiar link" works from the first render. */
export function JoinCodeCard({
  workspaceId,
  joinCode,
  link,
  archived,
}: {
  workspaceId: string;
  joinCode: string;
  link: string;
  archived: boolean;
}) {
  const [copied, setCopied] = useState<Copied>(null);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy(what: Exclude<Copied, null>) {
    try {
      await navigator.clipboard.writeText(what === 'code' ? joinCode : link);
      setCopyFailed(false);
      setCopied(what);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <section
      aria-labelledby="codigo-titulo"
      className="grid gap-5 rounded-surface border border-line bg-paper p-6 sm:p-7"
    >
      <div className="grid gap-1">
        <h2 id="codigo-titulo" className="text-lg font-semibold">
          Código para unirse
        </h2>
        <p className="text-sm text-ink-soft">
          {archived
            ? 'Mientras el curso esté archivado, el código y el link no funcionan.'
            : 'Tus estudiantes entran al link o escriben el código para sumarse a la nómina.'}
        </p>
      </div>

      <p
        className="font-display text-4xl font-semibold tracking-[0.18em] break-all text-ink sm:text-5xl"
        aria-label={`Código ${joinCode.split('').join(' ')}`}
      >
        {joinCode}
      </p>
      <p className="-mt-2 text-sm break-all text-ink-soft">{link}</p>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => copy('code')}>
          {copied === 'code' ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied === 'code' ? 'Código copiado' : 'Copiar código'}
        </Button>
        <Button variant="secondary" onClick={() => copy('link')}>
          {copied === 'link' ? <Check aria-hidden /> : <Link2 aria-hidden />}
          {copied === 'link' ? 'Link copiado' : 'Copiar link'}
        </Button>
        <RegenerateButton workspaceId={workspaceId} joinCode={joinCode} />
      </div>

      <p role="status" className="sr-only">
        {copied === 'code' ? 'Código copiado' : copied === 'link' ? 'Link copiado' : ''}
      </p>
      {copyFailed && (
        <Alert>No pudimos copiar. Selecciona el código o el link y cópialo con el teclado.</Alert>
      )}
    </section>
  );
}

function RegenerateButton({ workspaceId, joinCode }: { workspaceId: string; joinCode: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await regenerateJoinCodeAction(workspaceId);
      if (result.ok) {
        setError(undefined);
        setOpen(false);
      } else {
        setError(result.message);
      }
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
        <Button variant="ghost">
          <RefreshCw aria-hidden />
          Generar uno nuevo
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title="¿Generar un código nuevo?"
        description={
          <>
            El código <strong className="font-semibold text-ink">{joinCode}</strong> y su link van a dejar de
            funcionar. Quienes ya se unieron siguen en el curso; a los que falten, compárteles el código
            nuevo.
          </>
        }
        confirmLabel="Generar código nuevo"
        destructive
        pendingLabel="Generando…"
        onConfirm={confirm}
        pending={pending}
        error={error && <Alert>{error}</Alert>}
      />
    </AlertDialog>
  );
}
