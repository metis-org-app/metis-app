/*
 * Limits of POST /api/assessments/generate (metis-api docs/domain-model.md › AI assessment assistant), mirrored only to
 * give good messages before uploading. metis-api checks every file again by its content and stays the authority. The
 * 20 MB budget for PDFs and images sent as-is is not checked here: a PDF that does not fit is read as text, not rejected.
 */
const MB = 1024 * 1024;

export const GENERATOR_LIMITS = {
  topicMax: 300,
  levelMax: 100,
  instructionsMax: 2000,
  sourceTextMax: 50_000,
  itemCountMin: 1,
  itemCountMax: 30,
  itemCountDefault: 10,
  maxFiles: 5,
  maxFileBytes: 15 * MB,
  maxImageBytes: 5 * MB,
  maxUploadBytes: 40 * MB,
} as const;

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

/** What metis-api reads: PDF and images as-is; documents, presentations, spreadsheets and text formats as text. */
export const ACCEPTED_EXTENSIONS = [
  '.pdf',
  ...IMAGE_EXTENSIONS,
  '.docx',
  '.pptx',
  '.xlsx',
  '.odt',
  '.odp',
  '.ods',
  '.rtf',
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.html',
  '.htm',
  '.json',
];

export const extensionOf = (fileName: string) => {
  const dot = fileName.lastIndexOf('.');
  return dot < 0 ? '' : fileName.slice(dot).toLowerCase();
};

export const isImage = (fileName: string) => IMAGE_EXTENSIONS.includes(extensionOf(fileName));
