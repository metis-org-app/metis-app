import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { devApiStub, devGenerateDraft } from '@/lib/api/dev-stubs';
import { assessmentDraftSchema, assessmentSchema } from './contract';

// The development session answers with these stubs (src/lib/api/dev-stubs.ts) instead of metis-api, so they must keep
// the shapes of this contract: a drift would only show up as a broken page under `next dev`.
describe('development stubs', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function sampleDraft() {
    const form = new FormData();
    form.set('topic', 'La fotosíntesis');
    form.set('itemCount', '4');
    const pending = devGenerateDraft(form);
    await vi.runAllTimersAsync();
    return assessmentDraftSchema.parse(await pending);
  }

  it('proposes a draft with one typed definition per item', async () => {
    const draft = await sampleDraft();

    expect(draft.title).toBe('Evaluación: La fotosíntesis');
    expect(draft.items.map((item) => item.definition.type)).toEqual([
      'SingleChoice',
      'MultipleChoice',
      'TrueFalse',
      'Essay',
    ]);
  });

  it('saves the draft as an assessment the editor can load, with the option keys assigned', async () => {
    const draft = await sampleDraft();

    const created = assessmentSchema.parse(
      devApiStub('POST', '/api/assessments', {
        title: draft.title,
        instructions: draft.instructions,
        items: draft.items,
      }),
    );
    const loaded = assessmentSchema.parse(devApiStub('GET', `/api/assessments/${created.id}`, undefined));

    expect(loaded.items).toHaveLength(4);
    expect(loaded.items.map((item) => item.position)).toEqual([1, 2, 3, 4]);
    const first = loaded.items[0]!.definition;
    expect(first.type === 'SingleChoice' && first.options.map((option) => option.key)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });
});
