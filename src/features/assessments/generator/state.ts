import type { AssessmentDraft, DraftItem } from '../contract';
import type { GenerateFailure } from './request';

/*
 * The screen of "Pedirle un borrador a Metis": the form, the wait while Metis writes, and the review of the draft. A
 * failure and a cancellation return to the form with what the teacher typed, saying what happened. The draft exists
 * only here, in the browser, until the teacher creates the assessment from it.
 */

/** A draft question with a stable key for React and for removing it. */
export type ReviewItem = { key: string; item: DraftItem };

export type ReviewDraft = {
  title: string;
  instructions: string;
  items: ReviewItem[];
  notices: string[];
  aiGenerated: boolean;
};

export type GeneratorState =
  | { status: 'form' }
  | { status: 'generating' }
  | { status: 'review'; draft: ReviewDraft }
  | { status: 'error'; failure: GenerateFailure }
  | { status: 'cancelled' };

export type GeneratorEvent =
  | { type: 'submit' }
  | { type: 'succeeded'; draft: AssessmentDraft }
  | { type: 'failed'; failure: GenerateFailure }
  | { type: 'cancelled' }
  | { type: 'regenerate' }
  | { type: 'editTitle'; title: string }
  | { type: 'editInstructions'; instructions: string }
  | { type: 'removeItem'; key: string };

export const initialState: GeneratorState = { status: 'form' };

let nextKey = 0;

export function toReviewDraft(draft: AssessmentDraft): ReviewDraft {
  return {
    title: draft.title,
    instructions: draft.instructions ?? '',
    items: draft.items.map((item) => ({ key: `draft-item-${++nextKey}`, item })),
    notices: draft.notices,
    aiGenerated: draft.aiGenerated,
  };
}

export function generatorReducer(state: GeneratorState, event: GeneratorEvent): GeneratorState {
  switch (event.type) {
    case 'submit':
      return state.status === 'generating' || state.status === 'review' ? state : { status: 'generating' };

    // Answers only count while waiting: one that arrives after a cancellation is dropped.
    case 'succeeded':
      return state.status === 'generating' ? { status: 'review', draft: toReviewDraft(event.draft) } : state;
    case 'failed':
      return state.status === 'generating' ? { status: 'error', failure: event.failure } : state;
    case 'cancelled':
      return state.status === 'generating' ? { status: 'cancelled' } : state;

    case 'regenerate':
      return state.status === 'review' ? { status: 'form' } : state;

    case 'editTitle':
      return state.status === 'review'
        ? { status: 'review', draft: { ...state.draft, title: event.title } }
        : state;
    case 'editInstructions':
      return state.status === 'review'
        ? { status: 'review', draft: { ...state.draft, instructions: event.instructions } }
        : state;
    case 'removeItem':
      return state.status === 'review'
        ? {
            status: 'review',
            draft: { ...state.draft, items: state.draft.items.filter((entry) => entry.key !== event.key) },
          }
        : state;
  }
}
