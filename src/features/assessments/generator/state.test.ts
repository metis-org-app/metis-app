import type { AssessmentDraft } from '../contract';
import { generatorReducer, initialState, type GeneratorState } from './state';

const draft: AssessmentDraft = {
  title: 'Fotosíntesis',
  instructions: null,
  items: [
    {
      type: 'TrueFalse',
      prompt: 'La clorofila es verde.',
      points: 1,
      options: null,
      isTrue: true,
      minWords: null,
      maxWords: null,
      teacherNotes: null,
      assistantEnabled: true,
      studentHint: null,
    },
    {
      type: 'Essay',
      prompt: 'Explica la fotosíntesis.',
      points: 4,
      options: null,
      isTrue: null,
      minWords: 50,
      maxWords: 200,
      teacherNotes: null,
      assistantEnabled: true,
      studentHint: null,
    },
  ],
  notices: ['Metis está en modo de ejemplo.'],
  aiGenerated: false,
};

const failure = { ok: false as const, message: 'Metis no pudo generar el borrador.', fieldErrors: {} };

const run = (...events: Parameters<typeof generatorReducer>[1][]): GeneratorState =>
  events.reduce(generatorReducer, initialState);

describe('generatorReducer', () => {
  it('goes from the form to the wait and then to the review', () => {
    const generating = run({ type: 'submit' });
    expect(generating).toEqual({ status: 'generating' });

    const review = generatorReducer(generating, { type: 'succeeded', draft });
    expect(review.status).toBe('review');
    if (review.status !== 'review') return;
    expect(review.draft.title).toBe('Fotosíntesis');
    expect(review.draft.instructions).toBe('');
    expect(review.draft.items.map((entry) => entry.item.prompt)).toEqual([
      'La clorofila es verde.',
      'Explica la fotosíntesis.',
    ]);
    expect(new Set(review.draft.items.map((entry) => entry.key)).size).toBe(2);
  });

  it('reports a failure and lets the teacher try again', () => {
    const failed = run({ type: 'submit' }, { type: 'failed', failure });
    expect(failed).toEqual({ status: 'error', failure });
    expect(generatorReducer(failed, { type: 'submit' })).toEqual({ status: 'generating' });
  });

  it('drops an answer that arrives after a cancellation', () => {
    const cancelled = run({ type: 'submit' }, { type: 'cancelled' });
    expect(cancelled).toEqual({ status: 'cancelled' });
    expect(generatorReducer(cancelled, { type: 'succeeded', draft })).toBe(cancelled);
    expect(generatorReducer(cancelled, { type: 'failed', failure })).toBe(cancelled);
  });

  it('edits the draft and removes questions only during the review', () => {
    let state = run({ type: 'submit' }, { type: 'succeeded', draft });
    if (state.status !== 'review') throw new Error('expected a review');
    const firstKey = state.draft.items[0]!.key;

    state = generatorReducer(state, { type: 'editTitle', title: 'Fotosíntesis, 7° A' });
    state = generatorReducer(state, { type: 'editInstructions', instructions: 'Responde con calma.' });
    state = generatorReducer(state, { type: 'removeItem', key: firstKey });

    expect(state.status === 'review' && state.draft).toMatchObject({
      title: 'Fotosíntesis, 7° A',
      instructions: 'Responde con calma.',
      items: [{ item: { prompt: 'Explica la fotosíntesis.' } }],
    });
    expect(generatorReducer(initialState, { type: 'removeItem', key: firstKey })).toBe(initialState);
  });

  it('returns to the form to generate again', () => {
    const review = run({ type: 'submit' }, { type: 'succeeded', draft });
    expect(generatorReducer(review, { type: 'regenerate' })).toEqual({ status: 'form' });
    // A second submit while waiting does not start over.
    const generating = run({ type: 'submit' });
    expect(generatorReducer(generating, { type: 'submit' })).toBe(generating);
  });
});
