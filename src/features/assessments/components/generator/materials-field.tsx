'use client';

import { ChevronDown, ClipboardPaste, FileText, Paperclip, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/cn';
import { formatFileSize, type FileProblem } from '../../generator/files';
import { ACCEPTED_EXTENSIONS, GENERATOR_LIMITS } from '../../generator/limits';

type MaterialsMenuProps = {
  /** Materials attached so far (files plus pasted text), shown as a count on the button. */
  count: number;
  sourceText: string;
  onAddFiles: (files: File[]) => void;
  onSourceTextChange: (text: string) => void;
};

/**
 * The "Materiales" button of the prompt: a small menu where the teacher picks a file ("Subir archivos",
 * which opens the browser's file window) or pastes text ("Pegar texto"). Whatever is chosen lands as a
 * chip in the prompt (see AttachmentChips); nothing unfolds below the prompt.
 */
export function MaterialsMenu({ count, sourceText, onAddFiles, onSourceTextChange }: MaterialsMenuProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pasting, setPasting] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">
            <Paperclip aria-hidden />
            Materiales
            {count > 0 && (
              <span aria-hidden className="rounded-full bg-cream-deep px-2 text-xs">
                {count}
              </span>
            )}
            <ChevronDown aria-hidden className="opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => inputRef.current?.click()}>
            <Upload aria-hidden className="size-4 shrink-0" />
            Subir archivos
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPasting(true)}>
            <ClipboardPaste aria-hidden className="size-4 shrink-0" />
            Pegar texto
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.join(',')}
        aria-label="Elegir archivos"
        tabIndex={-1}
        className="sr-only"
        onChange={(event) => {
          onAddFiles([...(event.target.files ?? [])]);
          // Lets the same file be chosen again after removing it.
          event.target.value = '';
        }}
      />

      <Dialog open={pasting} onOpenChange={setPasting}>
        <DialogContent
          title="Pegar texto"
          description="Apuntes, una lectura o la materia que quieres evaluar. Metis las usa como base del borrador."
        >
          <Field
            id="generator-source-text"
            label="Texto para Metis"
            hint="Pega aquí apuntes, una lectura o la materia que quieres evaluar (hasta 50.000 caracteres)."
          >
            {(control) => (
              <Textarea
                {...control}
                value={sourceText}
                rows={8}
                maxLength={GENERATOR_LIMITS.sourceTextMax}
                onChange={(event) => onSourceTextChange(event.target.value)}
              />
            )}
          </Field>
          <div className="flex justify-end">
            <DialogClose asChild>
              <Button variant="secondary">Listo</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

type AttachmentChipsProps = {
  files: File[];
  problems: FileProblem[];
  /** The file metis-api could not read or found too large, to mark it in the chip row. */
  rejectedFileName?: string | undefined;
  sourceText: string;
  /** Where a problem with the materials is explained: under the prompt, never hidden in a panel. */
  fileError?: string | undefined;
  sourceTextError?: string | undefined;
  onRemoveFile: (file: File) => void;
  onRemoveSourceText: () => void;
};

/** The materials attached to the prompt, as chips the teacher can remove — like attachments in a chat. */
export function AttachmentChips({
  files,
  problems,
  rejectedFileName,
  sourceText,
  fileError,
  sourceTextError,
  onRemoveFile,
  onRemoveSourceText,
}: AttachmentChipsProps) {
  const hasText = sourceText.trim().length > 0;
  const hasProblems = problems.length > 0 || Boolean(fileError) || Boolean(sourceTextError);
  if (files.length === 0 && !hasText && !hasProblems) return null;

  return (
    <div className="grid gap-2 px-5 pb-1 sm:px-6">
      {hasProblems && (
        <ul
          role="alert"
          className="grid gap-1 rounded-control border border-danger/25 bg-danger-soft px-4 py-3 text-sm"
        >
          {problems.map((problem) => (
            <li key={`${problem.fileName}-${problem.message}`} className="break-words text-danger">
              <span className="font-semibold">{problem.fileName}:</span> {problem.message}
            </li>
          ))}
          {fileError && <li className="text-danger">{fileError}</li>}
          {sourceTextError && <li className="text-danger">{sourceTextError}</li>}
        </ul>
      )}

      {(files.length > 0 || hasText) && (
        <ul aria-label="Materiales para Metis" className="flex flex-wrap items-center gap-2">
          {files.map((file) => {
            const rejected = file.name === rejectedFileName;
            return (
              <li
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className={cn(
                  'flex items-center gap-2 rounded-full border py-1.5 pr-1.5 pl-3 text-sm',
                  rejected ? 'border-danger bg-danger-soft' : 'border-line bg-cream-deep/50',
                )}
              >
                <FileText aria-hidden className="size-4 shrink-0 text-ink-soft" />
                <span className="max-w-52 min-w-0 truncate font-medium">{file.name}</span>
                <span className={cn('shrink-0 text-xs', rejected ? 'text-danger' : 'text-ink-soft')}>
                  {rejected ? 'Metis no pudo usar este archivo.' : formatFileSize(file.size)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={`Quitar ${file.name}`}
                  onClick={() => onRemoveFile(file)}
                >
                  <X aria-hidden />
                </Button>
              </li>
            );
          })}
          {hasText && (
            <li className="flex items-center gap-2 rounded-full border border-line bg-cream-deep/50 py-1.5 pr-1.5 pl-3 text-sm">
              <ClipboardPaste aria-hidden className="size-4 shrink-0 text-ink-soft" />
              <span className="font-medium">Texto pegado</span>
              <span className="shrink-0 text-xs text-ink-soft">
                {sourceText.length.toLocaleString('es-CL')} caracteres
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Quitar el texto pegado"
                onClick={onRemoveSourceText}
              >
                <X aria-hidden />
              </Button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
