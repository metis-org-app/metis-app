import { ITEM_TYPES, type ItemType } from '../contract';
import { GENERATOR_LIMITS } from './limits';

export const DIFFICULTIES = ['Basic', 'Intermediate', 'Advanced'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  Basic: 'Básica',
  Intermediate: 'Intermedia',
  Advanced: 'Avanzada',
};

/** What the teacher typed in the form, kept as text so "Volver a generar" returns it exactly as it was. */
export type GeneratorValues = {
  topic: string;
  level: string;
  itemCount: string;
  difficulty: Difficulty;
  allowedTypes: ItemType[];
  instructions: string;
  sourceText: string;
};

export const DEFAULT_VALUES: GeneratorValues = {
  topic: '',
  level: '',
  itemCount: String(GENERATOR_LIMITS.itemCountDefault),
  difficulty: 'Intermediate',
  allowedTypes: [...ITEM_TYPES],
  instructions: '',
  sourceText: '',
};

export type GeneratorField =
  'topic' | 'level' | 'itemCount' | 'allowedTypes' | 'instructions' | 'sourceText' | 'files';
export type GeneratorFieldErrors = Partial<Record<GeneratorField, string>>;

/** Same rules as metis-api, to answer before uploading anything. */
export function validateValues(values: GeneratorValues): GeneratorFieldErrors {
  const errors: GeneratorFieldErrors = {};
  const count = Number(values.itemCount);

  if (values.topic.trim() === '') errors.topic = 'Escribe el tema de la evaluación.';
  else if (values.topic.trim().length > GENERATOR_LIMITS.topicMax)
    errors.topic = 'El tema puede tener hasta 300 caracteres.';
  if (values.level.trim().length > GENERATOR_LIMITS.levelMax)
    errors.level = 'El nivel o curso puede tener hasta 100 caracteres.';
  if (
    !Number.isInteger(count) ||
    count < GENERATOR_LIMITS.itemCountMin ||
    count > GENERATOR_LIMITS.itemCountMax
  )
    errors.itemCount = 'Pide entre 1 y 30 preguntas.';
  if (values.allowedTypes.length === 0) errors.allowedTypes = 'Elige al menos un tipo de pregunta.';
  if (values.instructions.trim().length > GENERATOR_LIMITS.instructionsMax)
    errors.instructions = 'Las indicaciones pueden tener hasta 2000 caracteres.';
  if (values.sourceText.trim().length > GENERATOR_LIMITS.sourceTextMax)
    errors.sourceText = 'El texto pegado puede tener hasta 50.000 caracteres.';

  return errors;
}

/**
 * The multipart body of POST /api/assessments/generate. Empty optional fields are left out; allowedTypes and files are
 * repeated once per value, which is how metis-api reads them. The browser streams the files; nothing is read here.
 */
export function buildGenerateFormData(values: GeneratorValues, files: readonly File[]): FormData {
  const formData = new FormData();
  formData.append('topic', values.topic.trim());
  if (values.level.trim()) formData.append('level', values.level.trim());
  formData.append('itemCount', String(Number(values.itemCount)));
  formData.append('difficulty', values.difficulty);
  for (const type of ITEM_TYPES.filter((type) => values.allowedTypes.includes(type))) {
    formData.append('allowedTypes', type);
  }
  if (values.instructions.trim()) formData.append('instructions', values.instructions.trim());
  if (values.sourceText.trim()) formData.append('sourceText', values.sourceText.trim());
  for (const file of files) formData.append('files', file, file.name);
  return formData;
}
