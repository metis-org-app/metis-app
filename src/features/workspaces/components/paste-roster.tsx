'use client';

import { CircleAlert, CircleCheck, ClipboardPaste, LoaderCircle } from 'lucide-react';
import { useId, useMemo, useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/cn';
import { parseRoster } from '../roster-parser';
import { ROSTER_MAX, type RosterResult, type StudentInput } from '../schemas';

type PasteRosterProps = {
  /** Uploads the parsed students; the page binds it to the course (addRosterAction). */
  onUpload: (students: StudentInput[]) => Promise<RosterResult>;
};

/** "Pegar lista": a dialog where the teacher pastes a roster, sees what will be loaded and uploads it. */
export function PasteRoster({ onUpload }: PasteRosterProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <ClipboardPaste aria-hidden />
          Pegar lista
        </Button>
      </DialogTrigger>
      {open && (
        <DialogContent
          title="Pegar lista de estudiantes"
          description="Una línea por estudiante, con el nombre y el email separados por una coma o una tabulación. Puedes copiar dos columnas desde Excel o Google Sheets."
          className="max-w-2xl"
        >
          <PasteRosterForm onUpload={onUpload} onClose={() => setOpen(false)} />
        </DialogContent>
      )}
    </Dialog>
  );
}

export function PasteRosterForm({ onUpload, onClose }: PasteRosterProps & { onClose: () => void }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<RosterResult>();
  const [pending, startTransition] = useTransition();
  const parsed = useMemo(() => parseRoster(text), [text]);
  const summaryId = useId();

  const count = parsed.students.length;
  const blocked = count === 0 || parsed.invalidCount > 0 || parsed.tooMany;

  if (result?.ok) {
    return (
      <div className="grid gap-5">
        <div role="status" className="grid gap-2 rounded-control border border-success/30 bg-cream px-4 py-3">
          <p className="flex items-center gap-2 font-semibold text-success">
            <CircleCheck aria-hidden className="size-4" />
            {result.added === 1 ? 'Agregamos 1 estudiante.' : `Agregamos ${result.added} estudiantes.`}
          </p>
          {result.alreadyEnrolled.length > 0 && (
            <p className="text-sm text-ink-soft">
              {result.alreadyEnrolled.length === 1
                ? 'Este email ya estaba en el curso y no se duplicó: '
                : `Estos ${result.alreadyEnrolled.length} emails ya estaban en el curso y no se duplicaron: `}
              {result.alreadyEnrolled.join(', ')}.
            </p>
          )}
        </div>
        <Button className="justify-self-end" onClick={onClose}>
          Listo
        </Button>
      </div>
    );
  }

  function upload() {
    startTransition(async () => setResult(await onUpload(parsed.students)));
  }

  return (
    <div className="grid gap-5">
      {result && !result.ok && <Alert>{result.message}</Alert>}

      <Field id="roster-text" label="Lista de estudiantes">
        {(control) => (
          <Textarea
            {...control}
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            spellCheck={false}
            placeholder={'Camila Rojas, camila.rojas@colegio.cl\nDiego Soto\tdiego.soto@colegio.cl'}
          />
        )}
      </Field>

      {parsed.lines.length > 0 && (
        <section aria-labelledby={summaryId} className="grid gap-3">
          <h3 id={summaryId} className="text-sm font-semibold">
            {summary(count, parsed.invalidCount)}
          </h3>
          {parsed.tooMany && (
            <Alert>
              Puedes cargar hasta {ROSTER_MAX} estudiantes a la vez. Divide la lista y pégala en partes.
            </Alert>
          )}
          <ol className="max-h-64 divide-y divide-line overflow-y-auto rounded-control border border-line">
            {parsed.lines.map((line) => (
              <li
                key={line.line}
                className={cn(
                  'grid grid-cols-[2.5rem_1fr] gap-x-2 px-3 py-2 text-sm',
                  line.error && 'bg-danger-soft',
                )}
              >
                <span className="text-ink-soft tabular-nums">{line.line}</span>
                <div className="grid min-w-0">
                  <span className="truncate font-semibold">{line.name || '—'}</span>
                  <span className="truncate text-ink-soft">{line.email || '—'}</span>
                  {line.error ? (
                    <span className="flex items-center gap-1.5 text-danger">
                      <CircleAlert aria-hidden className="size-3.5 shrink-0" />
                      <span>
                        <span className="sr-only">Línea {line.line} con problema: </span>
                        {line.error}
                      </span>
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
          {parsed.invalidCount > 0 && (
            <p className="text-sm text-ink-soft">
              Corrige o borra las líneas marcadas para poder cargar la lista.
            </p>
          )}
        </section>
      )}

      <Button
        className="justify-self-end"
        onClick={upload}
        disabled={blocked || pending}
        aria-disabled={blocked || pending}
      >
        {pending ? (
          <>
            <LoaderCircle aria-hidden className="animate-spin" />
            Agregando…
          </>
        ) : count === 1 ? (
          'Agregar 1 estudiante'
        ) : (
          `Agregar ${count} estudiantes`
        )}
      </Button>
    </div>
  );
}

function summary(valid: number, invalid: number) {
  const ready = valid === 1 ? '1 estudiante listo para cargar' : `${valid} estudiantes listos para cargar`;
  if (invalid === 0) return ready;
  return `${ready} · ${invalid === 1 ? '1 línea con problemas' : `${invalid} líneas con problemas`}`;
}
