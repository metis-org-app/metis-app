import { ACCEPTED_EXTENSIONS, extensionOf, GENERATOR_LIMITS, isImage } from './limits';

export type FileProblem = { fileName: string; message: string };

export const FILE_MESSAGES = {
  format:
    'Metis no puede leer este formato. Sube PDF, imágenes, Word, PowerPoint, Excel, OpenDocument, RTF o texto.',
  tooLarge: 'Este archivo pesa más de 15 MB.',
  imageTooLarge: 'Las imágenes pueden pesar hasta 5 MB.',
  empty: 'El archivo está vacío.',
  tooMany: 'Puedes subir hasta 5 archivos.',
  totalTooLarge: 'Los archivos pueden sumar hasta 40 MB.',
} as const;

const sameFile = (a: File, b: File) =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

/**
 * Adds the chosen or dropped files to the list, checking format (by extension), size and count. Files that break a rule
 * are left out and reported; the same file chosen twice is skipped silently.
 */
export function addFiles(
  current: readonly File[],
  incoming: readonly File[],
): { files: File[]; problems: FileProblem[] } {
  const files = [...current];
  const problems: FileProblem[] = [];
  let total = files.reduce((sum, file) => sum + file.size, 0);

  for (const file of incoming) {
    if (files.some((existing) => sameFile(existing, file))) continue;

    const message = !ACCEPTED_EXTENSIONS.includes(extensionOf(file.name))
      ? FILE_MESSAGES.format
      : file.size === 0
        ? FILE_MESSAGES.empty
        : file.size > GENERATOR_LIMITS.maxFileBytes
          ? FILE_MESSAGES.tooLarge
          : isImage(file.name) && file.size > GENERATOR_LIMITS.maxImageBytes
            ? FILE_MESSAGES.imageTooLarge
            : files.length >= GENERATOR_LIMITS.maxFiles
              ? FILE_MESSAGES.tooMany
              : total + file.size > GENERATOR_LIMITS.maxUploadBytes
                ? FILE_MESSAGES.totalTooLarge
                : null;

    if (message) {
      problems.push({ fileName: file.name, message });
      continue;
    }

    files.push(file);
    total += file.size;
  }

  return { files, problems };
}

const sizeFormat = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });

/** "820 KB", "1,2 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${sizeFormat.format(bytes / (1024 * 1024))} MB`;
}
