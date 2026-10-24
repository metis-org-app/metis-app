'use client';

import { FileText, ShieldCheck, Upload, X } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/cn';
import { formatFileSize, type FileProblem } from '../../generator/files';
import { ACCEPTED_EXTENSIONS, GENERATOR_LIMITS } from '../../generator/limits';

type MaterialsFieldProps = {
  files: File[];
  problems: FileProblem[];
  /** The file metis-api could not read or found too large, to mark it in the list. */
  rejectedFileName?: string | undefined;
  sourceText: string;
  sourceTextError?: string | undefined;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (file: File) => void;
  onSourceTextChange: (text: string) => void;
};

/** "Materiales": files to drop or choose, checked before uploading, and text to paste. */
export function MaterialsField({
  files,
  problems,
  rejectedFileName,
  sourceText,
  sourceTextError,
  onAddFiles,
  onRemoveFile,
  onSourceTextChange,
}: MaterialsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    onAddFiles([...event.dataTransfer.files]);
  }

  return (
    <fieldset className="grid gap-4">
      <legend className="mb-1 text-lg font-semibold">Materiales</legend>
      <p className="text-sm text-ink-soft">
        Opcional. Metis basa las preguntas en lo que subas o pegues; sin materiales, las escribe a partir del
        tema.
      </p>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'grid justify-items-center gap-3 rounded-surface border-2 border-dashed px-5 py-7 text-center transition-colors',
          dragging ? 'border-ink bg-cream-deep' : 'border-line bg-cream/60',
        )}
      >
        <Upload aria-hidden className="size-6 text-ink-soft" />
        <p className="font-semibold">Arrastra tus archivos aquí</p>
        <Button variant="secondary" onClick={() => inputRef.current?.click()}>
          Elegir archivos
        </Button>
        <p id="materials-hint" className="max-w-md text-sm text-ink-soft">
          PDF, imágenes, Word, PowerPoint, Excel, OpenDocument, RTF o texto. Hasta {GENERATOR_LIMITS.maxFiles}{' '}
          archivos de 15 MB cada uno (las imágenes, hasta 5 MB) y 40 MB en total.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(',')}
          aria-label="Elegir archivos"
          aria-describedby="materials-hint"
          tabIndex={-1}
          className="sr-only"
          onChange={(event) => {
            onAddFiles([...(event.target.files ?? [])]);
            // Lets the same file be chosen again after removing it.
            event.target.value = '';
          }}
        />
      </div>

      {problems.length > 0 && (
        <ul
          role="alert"
          className="grid gap-1 rounded-control border border-danger/25 bg-danger-soft px-4 py-3 text-sm"
        >
          {problems.map((problem) => (
            <li key={`${problem.fileName}-${problem.message}`} className="break-words text-danger">
              <span className="font-semibold">{problem.fileName}:</span> {problem.message}
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul aria-label="Archivos para Metis" className="grid gap-2">
          {files.map((file) => {
            const rejected = file.name === rejectedFileName;
            return (
              <li
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className={cn(
                  'flex items-center gap-3 rounded-control border bg-paper px-4 py-2.5',
                  rejected ? 'border-danger' : 'border-line',
                )}
              >
                <FileText aria-hidden className="size-4 shrink-0 text-ink-soft" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{file.name}</span>
                  <span className={cn('block text-sm', rejected ? 'text-danger' : 'text-ink-soft')}>
                    {formatFileSize(file.size)}
                    {rejected && ' · Metis no pudo usar este archivo.'}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Quitar ${file.name}`}
                  onClick={() => onRemoveFile(file)}
                >
                  <X aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Field
        id="generator-source-text"
        label="Texto para Metis"
        hint="Pega aquí apuntes, una lectura o la materia que quieres evaluar (hasta 50.000 caracteres)."
        errors={sourceTextError ? [sourceTextError] : undefined}
      >
        {(control) => (
          <Textarea
            {...control}
            value={sourceText}
            maxLength={GENERATOR_LIMITS.sourceTextMax}
            onChange={(event) => onSourceTextChange(event.target.value)}
          />
        )}
      </Field>

      <p className="flex gap-2.5 rounded-control border border-line bg-cream-deep px-4 py-3 text-sm text-ink-soft">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          Tus materiales se envían a nuestro proveedor de IA para generar el borrador y no se guardan. No
          incluyas datos personales de estudiantes.
        </span>
      </p>
    </fieldset>
  );
}
