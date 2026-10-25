import { countWords, type StudentAnswer, type StudentItem } from '@/features/assessments';
import type { ApiAnswer } from './contract';

/*
 * Translation between what the question components hold (StudentAnswer) and the response shapes of metis-api. Pure,
 * so the autosave can work with plain data.
 */

/** metis-api's limit for an essay; the textarea stops there too. */
export const MAX_ESSAY_LENGTH = 20_000;

/** The response to send for an answer, or null to remove it (nothing selected, blank text). */
export function toApiAnswer(item: StudentItem, answer: StudentAnswer): ApiAnswer | null {
  switch (item.type) {
    case 'SingleChoice':
      return typeof answer === 'string' && answer !== '' ? { selectedKey: answer } : null;
    case 'MultipleChoice':
      return Array.isArray(answer) && answer.length > 0 ? { selectedKeys: answer } : null;
    case 'TrueFalse':
      return typeof answer === 'boolean' ? { value: answer } : null;
    case 'Essay':
      return typeof answer === 'string' && answer.trim() !== '' ? { text: answer } : null;
  }
}

export function fromApiAnswer(answer: ApiAnswer | null): StudentAnswer {
  if (answer === null) return null;
  if ('selectedKey' in answer) return answer.selectedKey;
  if ('selectedKeys' in answer) return answer.selectedKeys;
  if ('value' in answer) return answer.value;
  return answer.text;
}

export function isAnswered(item: StudentItem, answer: StudentAnswer) {
  return toApiAnswer(item, answer) !== null;
}

/**
 * An essay over its word limit cannot be saved (metis-api rejects it with 400, and with it the rest of the batch), so
 * the screen keeps it out of the autosave until the student shortens it. Words are counted like metis-api does.
 */
export function exceedsWordLimit(item: StudentItem, answer: StudentAnswer) {
  return (
    item.type === 'Essay' &&
    item.maxWords !== null &&
    typeof answer === 'string' &&
    countWords(answer) > item.maxWords
  );
}
