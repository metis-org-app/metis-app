import { assessmentDraftSchema, assessmentItemSchema, draftItemSchema } from './contract';

// As metis-api writes an item for its author: `definition`, plus the deprecated flat copies it still sends.
const apiItem = {
  id: '0190a000-0000-7000-8000-000000000001',
  position: 1,
  prompt: '¿Qué pueblo construyó los moai?',
  points: 2,
  definition: {
    type: 'SingleChoice',
    options: [
      { key: 'a', text: 'Rapa Nui', isCorrect: true },
      { key: 'b', text: 'Aymara', isCorrect: false },
    ],
  },
  teacherNotes: null,
  assistantEnabled: true,
  studentHint: 'Recuerda en qué isla están.',
  type: 'SingleChoice',
  options: [
    { key: 'a', text: 'Rapa Nui', isCorrect: true },
    { key: 'b', text: 'Aymara', isCorrect: false },
  ],
  isTrue: null,
  minWords: null,
  maxWords: null,
};

const draftFields = {
  prompt: 'La clorofila es verde.',
  points: 1,
  teacherNotes: null,
  assistantEnabled: true,
  studentHint: null,
};

describe('assessmentItemSchema', () => {
  it('reads the definition and drops the deprecated flat copies', () => {
    const item = assessmentItemSchema.parse(apiItem);

    expect(item.definition).toEqual(apiItem.definition);
    expect(item).not.toHaveProperty('type');
    expect(item).not.toHaveProperty('options');
  });

  it('reads every definition type', () => {
    for (const definition of [
      { type: 'MultipleChoice', options: [{ key: 'a', text: 'Chile', isCorrect: true }] },
      { type: 'TrueFalse', isTrue: false },
      { type: 'Essay', minWords: null, maxWords: 300 },
    ]) {
      expect(assessmentItemSchema.parse({ ...apiItem, definition }).definition).toEqual(definition);
    }
  });

  it('rejects an item without a definition or with an unknown type', () => {
    const { definition, ...withoutDefinition } = apiItem;
    expect(definition.type).toBe('SingleChoice');
    expect(assessmentItemSchema.safeParse(withoutDefinition).success).toBe(false);
    expect(assessmentItemSchema.safeParse({ ...apiItem, definition: { type: 'Matching' } }).success).toBe(
      false,
    );
  });
});

describe('draftItemSchema', () => {
  it('reads a draft item with the flat fields metis-api sends today as a definition', () => {
    const item = draftItemSchema.parse({
      ...draftFields,
      type: 'TrueFalse',
      options: null,
      isTrue: true,
      minWords: null,
      maxWords: null,
    });

    expect(item).toEqual({ ...draftFields, definition: { type: 'TrueFalse', isTrue: true } });
  });

  it('reads a draft item that already has a definition, as metis-api will send it', () => {
    const definition = { type: 'Essay', minWords: 50, maxWords: null } as const;

    expect(draftItemSchema.parse({ ...draftFields, definition })).toEqual({ ...draftFields, definition });
  });

  it('rejects a flat draft item that misses the answer of its type', () => {
    expect(draftItemSchema.safeParse({ ...draftFields, type: 'TrueFalse', isTrue: null }).success).toBe(
      false,
    );
    expect(draftItemSchema.safeParse({ ...draftFields, type: 'SingleChoice', options: null }).success).toBe(
      false,
    );
  });

  it('reads a whole draft from the generator', () => {
    const draft = assessmentDraftSchema.parse({
      title: 'Fotosíntesis',
      instructions: null,
      items: [
        { ...draftFields, type: 'TrueFalse', options: null, isTrue: true, minWords: null, maxWords: null },
      ],
      notices: [],
      aiGenerated: true,
    });

    expect(draft.items).toEqual([{ ...draftFields, definition: { type: 'TrueFalse', isTrue: true } }]);
  });
});
