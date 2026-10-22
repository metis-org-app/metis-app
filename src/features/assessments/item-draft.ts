import type { AssessmentItem, ItemRequest, ItemType } from './contract';

/*
 * The editor's working copy of one item. Inputs keep what the teacher typed (points and word limits as text), so a
 * half-written value is never coerced away. `missingFor` lists what stops the item from being saved and `toRequest`
 * builds the API body. These limits mirror metis-api only to give good messages; the API stays the authority.
 */

export const LIMITS = {
  promptMax: 5000,
  notesMax: 5000,
  hintMax: 1000,
  optionMax: 500,
  minOptions: 2,
  maxOptions: 8,
  pointsMin: 0.5,
  pointsMax: 100,
  wordsMax: 5000,
  itemsMax: 100,
  titleMax: 200,
  instructionsMax: 5000,
} as const;

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  SingleChoice: 'Selección única',
  MultipleChoice: 'Selección múltiple',
  TrueFalse: 'Verdadero o falso',
  Essay: 'Respuesta abierta',
};

export type OptionDraft = { id: string; text: string; isCorrect: boolean };

export type ItemDraft = {
  type: ItemType;
  prompt: string;
  points: string;
  options: OptionDraft[];
  isTrue: boolean | null;
  minWords: string;
  maxWords: string;
  teacherNotes: string;
  assistantEnabled: boolean;
  studentHint: string;
};

let nextOptionId = 0;
/** Stable React keys for options, which have no id of their own (the server assigns keys by position). */
export const newOptionId = () => `option-${++nextOptionId}`;

const isChoice = (type: ItemType) => type === 'SingleChoice' || type === 'MultipleChoice';

const emptyOptions = (count: number): OptionDraft[] =>
  Array.from({ length: count }, () => ({ id: newOptionId(), text: '', isCorrect: false }));

export function emptyDraft(type: ItemType): ItemDraft {
  return {
    type,
    prompt: '',
    points: '1',
    options: isChoice(type) ? emptyOptions(type === 'MultipleChoice' ? 3 : 2) : [],
    isTrue: null,
    minWords: '',
    maxWords: '',
    teacherNotes: '',
    assistantEnabled: true,
    studentHint: '',
  };
}

export function draftFromItem(item: AssessmentItem): ItemDraft {
  return {
    type: item.type,
    prompt: item.prompt,
    points: formatPoints(item.points),
    options: (item.options ?? []).map((option) => ({
      id: newOptionId(),
      text: option.text,
      isCorrect: option.isCorrect,
    })),
    isTrue: item.isTrue,
    minWords: item.minWords?.toString() ?? '',
    maxWords: item.maxWords?.toString() ?? '',
    teacherNotes: item.teacherNotes ?? '',
    assistantEnabled: item.assistantEnabled,
    studentHint: item.studentHint ?? '',
  };
}

/** A copy for "Duplicar pregunta": same content, new option ids. */
export function copyDraft(draft: ItemDraft): ItemDraft {
  return { ...draft, options: draft.options.map((option) => ({ ...option, id: newOptionId() })) };
}

/**
 * Changes the type keeping what still makes sense: the prompt, points, notes and hint always; the options between
 * the two choice types. Single → multiple keeps the correct option; multiple → single keeps only the first correct
 * one, since a single choice item has exactly one.
 */
export function changeType(draft: ItemDraft, type: ItemType): ItemDraft {
  if (type === draft.type) return draft;
  const common = { ...draft, type, isTrue: null, minWords: '', maxWords: '' };

  if (isChoice(type) && isChoice(draft.type)) {
    if (type === 'MultipleChoice') return { ...common, options: draft.options };
    const firstCorrect = draft.options.findIndex((option) => option.isCorrect);
    return {
      ...common,
      options: draft.options.map((option, index) => ({ ...option, isCorrect: index === firstCorrect })),
    };
  }
  if (isChoice(type)) return { ...common, options: emptyOptions(type === 'MultipleChoice' ? 3 : 2) };
  return { ...common, options: [] };
}

export const canAddOption = (draft: ItemDraft) => draft.options.length < LIMITS.maxOptions;
export const canRemoveOption = (draft: ItemDraft) => draft.options.length > LIMITS.minOptions;

export function addOption(draft: ItemDraft): ItemDraft {
  if (!canAddOption(draft)) return draft;
  return { ...draft, options: [...draft.options, { id: newOptionId(), text: '', isCorrect: false }] };
}

export function removeOption(draft: ItemDraft, optionId: string): ItemDraft {
  if (!canRemoveOption(draft)) return draft;
  return { ...draft, options: draft.options.filter((option) => option.id !== optionId) };
}

export function setOptionText(draft: ItemDraft, optionId: string, text: string): ItemDraft {
  return {
    ...draft,
    options: draft.options.map((option) => (option.id === optionId ? { ...option, text } : option)),
  };
}

/** Single choice: the marked option becomes the only correct one. Multiple choice: toggles it. */
export function markCorrect(draft: ItemDraft, optionId: string, checked = true): ItemDraft {
  return {
    ...draft,
    options: draft.options.map((option) =>
      draft.type === 'SingleChoice'
        ? { ...option, isCorrect: option.id === optionId }
        : option.id === optionId
          ? { ...option, isCorrect: checked }
          : option,
    ),
  };
}

/** Accepts "1,5" and "1.5". Returns NaN for anything that is not a plain number. */
export function parseDecimal(value: string) {
  const normalized = value.trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

function parseWords(value: string) {
  return value.trim() === '' ? undefined : /^\d+$/.test(value.trim()) ? Number(value.trim()) : Number.NaN;
}

export function formatPoints(points: number) {
  return points.toLocaleString('es-CL', { maximumFractionDigits: 2 });
}

export type DraftProblems = Partial<Record<'prompt' | 'points' | 'options' | 'isTrue' | 'words', string>>;

/** What the item still needs before it can be saved, keyed by field, in the teacher's words. */
export function missingFor(draft: ItemDraft): DraftProblems {
  const problems: DraftProblems = {};

  if (draft.prompt.trim() === '') problems.prompt = 'Escribe el enunciado.';

  const points = parseDecimal(draft.points);
  if (Number.isNaN(points) || points < LIMITS.pointsMin || points > LIMITS.pointsMax) {
    problems.points = 'Usa un puntaje entre 0,5 y 100.';
  } else if (!/^\d+([.,]\d{1,2})?$/.test(draft.points.trim())) {
    problems.points = 'El puntaje puede tener hasta 2 decimales.';
  }

  if (isChoice(draft.type)) {
    const texts = draft.options.map((option) => option.text.trim().toLocaleLowerCase('es-CL'));
    const correct = draft.options.filter((option) => option.isCorrect).length;
    if (texts.some((text) => text === '')) {
      problems.options = 'Escribe el texto de cada alternativa.';
    } else if (new Set(texts).size !== texts.length) {
      problems.options = 'Hay alternativas repetidas.';
    } else if (draft.type === 'SingleChoice' && correct !== 1) {
      problems.options = 'Marca la alternativa correcta.';
    } else if (draft.type === 'MultipleChoice' && correct < 2) {
      problems.options = 'Marca al menos dos alternativas correctas.';
    } else if (draft.type === 'MultipleChoice' && correct === draft.options.length) {
      problems.options = 'Deja al menos una alternativa incorrecta, o la pregunta no distingue quién sabe.';
    }
  }

  if (draft.type === 'TrueFalse' && draft.isTrue === null) {
    problems.isTrue = 'Indica si la afirmación es verdadera o falsa.';
  }

  if (draft.type === 'Essay') {
    const min = parseWords(draft.minWords);
    const max = parseWords(draft.maxWords);
    const outOfRange = (words: number | undefined) =>
      words !== undefined && (Number.isNaN(words) || words < 1 || words > LIMITS.wordsMax);
    if (outOfRange(min) || outOfRange(max)) {
      problems.words = 'Usa números enteros entre 1 y 5000.';
    } else if (min !== undefined && max !== undefined && min > max) {
      problems.words = 'El mínimo de palabras no puede ser mayor que el máximo.';
    }
  }

  return problems;
}

export const isComplete = (draft: ItemDraft) => Object.keys(missingFor(draft)).length === 0;

const optional = (value: string) => (value.trim() === '' ? undefined : value.trim());

/** The API body. Only call it for a complete draft (see `missingFor`). */
export function toRequest(draft: ItemDraft): ItemRequest {
  const request: ItemRequest = {
    type: draft.type,
    prompt: draft.prompt.trim(),
    points: parseDecimal(draft.points),
    assistantEnabled: draft.assistantEnabled,
  };
  const teacherNotes = optional(draft.teacherNotes);
  const studentHint = optional(draft.studentHint);
  if (teacherNotes) request.teacherNotes = teacherNotes;
  if (studentHint) request.studentHint = studentHint;

  if (isChoice(draft.type)) {
    request.options = draft.options.map((option) => ({
      text: option.text.trim(),
      isCorrect: option.isCorrect,
    }));
  } else if (draft.type === 'TrueFalse') {
    request.isTrue = draft.isTrue ?? false;
  } else {
    const min = parseWords(draft.minWords);
    const max = parseWords(draft.maxWords);
    if (min !== undefined) request.minWords = min;
    if (max !== undefined) request.maxWords = max;
  }
  return request;
}

/** Points of a draft for the running total (0 while the value is not a valid number). */
export function draftPoints(draft: ItemDraft) {
  const points = parseDecimal(draft.points);
  return Number.isNaN(points) ? 0 : points;
}
