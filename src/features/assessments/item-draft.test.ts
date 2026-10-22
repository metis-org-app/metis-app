import type { AssessmentItem } from './contract';
import {
  addOption,
  changeType,
  draftFromItem,
  emptyDraft,
  markCorrect,
  missingFor,
  removeOption,
  setOptionText,
  toRequest,
  type ItemDraft,
} from './item-draft';

function choice(type: 'SingleChoice' | 'MultipleChoice', options: [string, boolean][]): ItemDraft {
  let draft = { ...emptyDraft(type), prompt: '¿Cuáles?', options: [] as ItemDraft['options'] };
  for (const [text, correct] of options) {
    draft = addOption(draft);
    const id = draft.options.at(-1)!.id;
    draft = setOptionText(draft, id, text);
    if (correct) draft = markCorrect(draft, id);
  }
  return draft;
}

const correctTexts = (draft: ItemDraft) =>
  draft.options.filter((option) => option.isCorrect).map((option) => option.text);

describe('changeType', () => {
  it('keeps the correct option when a single choice becomes multiple choice', () => {
    const single = choice('SingleChoice', [
      ['Santiago', true],
      ['Lima', false],
      ['Quito', false],
    ]);

    const multiple = changeType(single, 'MultipleChoice');

    expect(multiple.options.map((option) => option.text)).toEqual(['Santiago', 'Lima', 'Quito']);
    expect(correctTexts(multiple)).toEqual(['Santiago']);
    // It now needs a second correct option, and says so.
    expect(missingFor(multiple).options).toBe('Marca al menos dos alternativas correctas.');
  });

  it('keeps only the first correct option when a multiple choice becomes single choice', () => {
    const multiple = choice('MultipleChoice', [
      ['Chile', false],
      ['Perú', true],
      ['Bolivia', true],
    ]);

    const single = changeType(multiple, 'SingleChoice');

    expect(correctTexts(single)).toEqual(['Perú']);
    expect(missingFor(single).options).toBeUndefined();
  });

  it('keeps the prompt, points, notes and hint, and drops what does not belong to the new type', () => {
    const essay: ItemDraft = {
      ...emptyDraft('Essay'),
      prompt: 'Explica',
      points: '4',
      minWords: '10',
      teacherNotes: 'Notas',
      studentHint: 'Pista',
    };

    const trueFalse = changeType(essay, 'TrueFalse');

    expect(trueFalse).toMatchObject({
      prompt: 'Explica',
      points: '4',
      teacherNotes: 'Notas',
      studentHint: 'Pista',
    });
    expect(trueFalse.minWords).toBe('');
    expect(toRequest({ ...trueFalse, isTrue: true })).toEqual({
      type: 'TrueFalse',
      prompt: 'Explica',
      points: 4,
      isTrue: true,
      teacherNotes: 'Notas',
      studentHint: 'Pista',
      assistantEnabled: true,
    });
  });

  it('starts a choice item with empty options when coming from another type', () => {
    expect(changeType(emptyDraft('TrueFalse'), 'SingleChoice').options).toHaveLength(2);
  });
});

describe('options', () => {
  it('cannot go below 2 or above 8 options', () => {
    const two = choice('SingleChoice', [
      ['A', true],
      ['B', false],
    ]);
    expect(removeOption(two, two.options[0]!.id).options).toHaveLength(2);

    let eight = two;
    for (let count = 2; count < 10; count++) eight = addOption(eight);
    expect(eight.options).toHaveLength(8);
  });

  it('marking an option in single choice unmarks the others; in multiple choice it toggles', () => {
    const single = choice('SingleChoice', [
      ['A', true],
      ['B', false],
    ]);
    expect(correctTexts(markCorrect(single, single.options[1]!.id))).toEqual(['B']);

    const multiple = choice('MultipleChoice', [
      ['A', true],
      ['B', true],
      ['C', false],
    ]);
    expect(correctTexts(markCorrect(multiple, multiple.options[0]!.id, false))).toEqual(['B']);
  });
});

describe('missingFor', () => {
  it('lists what a new item needs', () => {
    expect(missingFor(emptyDraft('SingleChoice'))).toEqual({
      prompt: 'Escribe el enunciado.',
      options: 'Escribe el texto de cada alternativa.',
    });
    expect(missingFor({ ...emptyDraft('TrueFalse'), prompt: 'x' })).toEqual({
      isTrue: 'Indica si la afirmación es verdadera o falsa.',
    });
  });

  it('rejects repeated options ignoring case and spaces, and all-correct multiple choice', () => {
    expect(
      missingFor(
        choice('SingleChoice', [
          ['Santiago', true],
          [' santiago ', false],
        ]),
      ).options,
    ).toBe('Hay alternativas repetidas.');
    expect(
      missingFor(
        choice('MultipleChoice', [
          ['A', true],
          ['B', true],
        ]),
      ).options,
    ).toMatch(/al menos una alternativa incorrecta/);
  });

  it('validates points (comma decimals, range, 2 decimals) and the word range', () => {
    const base = { ...emptyDraft('Essay'), prompt: 'Explica' };
    expect(missingFor({ ...base, points: '1,5' })).toEqual({});
    expect(missingFor({ ...base, points: '1,15' })).toEqual({});
    expect(missingFor({ ...base, points: '0,25' }).points).toBe('Usa un puntaje entre 0,5 y 100.');
    expect(missingFor({ ...base, points: '1,255' }).points).toBe('El puntaje puede tener hasta 2 decimales.');
    expect(missingFor({ ...base, minWords: '300', maxWords: '50' }).words).toMatch(/mínimo/);
    expect(missingFor({ ...base, maxWords: '5001' }).words).toBe('Usa números enteros entre 1 y 5000.');
  });
});

describe('toRequest', () => {
  it('sends options without keys and only the fields of the type', () => {
    const draft = choice('SingleChoice', [
      [' Santiago ', true],
      ['Lima', false],
    ]);
    expect(toRequest({ ...draft, points: '2,5' })).toEqual({
      type: 'SingleChoice',
      prompt: '¿Cuáles?',
      points: 2.5,
      options: [
        { text: 'Santiago', isCorrect: true },
        { text: 'Lima', isCorrect: false },
      ],
      assistantEnabled: true,
    });
    expect(toRequest({ ...emptyDraft('Essay'), prompt: 'p', maxWords: '200' })).toEqual({
      type: 'Essay',
      prompt: 'p',
      points: 1,
      maxWords: 200,
      assistantEnabled: true,
    });
  });

  it('round-trips an item from the API', () => {
    const item: AssessmentItem = {
      id: '0190a000-0000-7000-8000-000000000001',
      position: 1,
      type: 'MultipleChoice',
      prompt: '¿Cuáles?',
      points: 3.5,
      options: [
        { key: 'a', text: 'Chile', isCorrect: true },
        { key: 'b', text: 'Perú', isCorrect: true },
        { key: 'c', text: 'España', isCorrect: false },
      ],
      isTrue: null,
      minWords: null,
      maxWords: null,
      teacherNotes: 'España está en Europa.',
      assistantEnabled: false,
      studentHint: null,
    };

    const draft = draftFromItem(item);

    expect(draft.points).toBe('3,5');
    expect(toRequest(draft)).toEqual({
      type: 'MultipleChoice',
      prompt: '¿Cuáles?',
      points: 3.5,
      options: [
        { text: 'Chile', isCorrect: true },
        { text: 'Perú', isCorrect: true },
        { text: 'España', isCorrect: false },
      ],
      teacherNotes: 'España está en Europa.',
      assistantEnabled: false,
    });
  });
});
