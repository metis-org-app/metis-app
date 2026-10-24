'use client';

import { Check, Link2, QrCode, RefreshCw, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useEffect, useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { AlertDialog, AlertDialogContent, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { regenerateShareTokenAction } from '../actions';

/**
 * The link students open. `link` is built on the server from APP_URL (`studentLinkFor`), so "Copiar link" and the QR
 * work from the first render. The QR is drawn in the browser (qrcode.react, no network).
 */
export function StudentLinkCard({
  assignmentId,
  link,
  title,
  closed,
}: {
  assignmentId: string;
  link: string;
  title: string;
  closed: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopyFailed(false);
      setCopied(true);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <section
      aria-labelledby="link-titulo"
      className="grid gap-5 rounded-surface border border-line bg-paper p-6 sm:p-7"
    >
      <div className="grid gap-1">
        <h2 id="link-titulo" className="text-lg font-semibold">
          Link para estudiantes
        </h2>
        <p className="text-sm text-ink-soft">
          {closed
            ? 'La asignación está cerrada: el link muestra que la evaluación ya cerró.'
            : 'Compártelo o proyecta el código QR para que lo escaneen desde el celular.'}
        </p>
      </div>

      <p className="font-semibold break-all text-ink">{link}</p>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={copy}>
          {copied ? <Check aria-hidden /> : <Link2 aria-hidden />}
          {copied ? 'Link copiado' : 'Copiar link'}
        </Button>
        <QrView link={link} title={title} />
        <RegenerateButton assignmentId={assignmentId} />
      </div>

      <p role="status" className="sr-only">
        {copied ? 'Link copiado' : ''}
      </p>
      {copyFailed && <Alert>No pudimos copiar. Selecciona el link y cópialo con el teclado.</Alert>}
    </section>
  );
}

/** Full-screen view to project in the classroom: a large QR and the link in readable type. */
function QrView({ link, title }: { link: string; title: string }) {
  const readable = link.replace(/^https?:\/\//, '');

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <Button variant="secondary">
          <QrCode aria-hidden />
          Mostrar código QR
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-paper p-6 text-ink focus:outline-none">
          <div className="grid w-full max-w-3xl justify-items-center gap-6 text-center sm:gap-8">
            <DialogPrimitive.Title className="font-display text-3xl font-semibold break-words sm:text-5xl">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Código QR del link para estudiantes: {link}
            </DialogPrimitive.Description>
            {/* The QR draws its own white background and quiet zone, which scanners need. */}
            <div className="rounded-surface border border-line bg-paper p-3 sm:p-4">
              <QRCodeSVG
                value={link}
                level="M"
                marginSize={2}
                title={`Código QR de ${link}`}
                className="size-[min(70vw,52dvh)] max-w-[32rem]"
              />
            </div>
            <p className="max-w-full text-xl font-semibold break-all sm:text-3xl">{readable}</p>
            <p className="text-ink-soft">Escanea el código con la cámara del celular o escribe el link.</p>
          </div>
          <DialogPrimitive.Close asChild>
            <Button variant="secondary" className="fixed top-4 right-4">
              <X aria-hidden />
              Cerrar
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function RegenerateButton({ assignmentId }: { assignmentId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await regenerateShareTokenAction(assignmentId);
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
          Generar link nuevo
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title="¿Generar un link nuevo?"
        description="El link actual y su código QR van a dejar de funcionar: quien lo abra verá que la evaluación no existe. Úsalo si el link llegó a quien no debía, y comparte el nuevo con tu curso."
        confirmLabel="Generar link nuevo"
        destructive
        pendingLabel="Generando…"
        onConfirm={confirm}
        pending={pending}
        error={error && <Alert>{error}</Alert>}
      />
    </AlertDialog>
  );
}
