import { buildGenerateFormData, DEFAULT_VALUES, validateValues, type GeneratorValues } from './values';

const values = (overrides: Partial<GeneratorValues> = {}): GeneratorValues => ({
  ...DEFAULT_VALUES,
  topic: 'La fotosíntesis',
  ...overrides,
});

describe('buildGenerateFormData', () => {
  it('sends every field metis-api reads, with allowedTypes and files repeated', () => {
    const pdf = new File(['%PDF-1.4'], 'guia.pdf', { type: 'application/pdf' });
    const notes = new File(['apuntes'], 'apuntes.txt', { type: 'text/plain' });

    const formData = buildGenerateFormData(
      values({
        topic: '  La fotosíntesis ',
        level: '7° básico',
        itemCount: '8',
        difficulty: 'Advanced',
        allowedTypes: ['Essay', 'SingleChoice'],
        instructions: 'Sin preguntas de memoria.',
        sourceText: 'Las plantas producen oxígeno.',
      }),
      [pdf, notes],
    );

    expect(formData.get('topic')).toBe('La fotosíntesis');
    expect(formData.get('level')).toBe('7° básico');
    expect(formData.get('itemCount')).toBe('8');
    expect(formData.get('difficulty')).toBe('Advanced');
    // In the order of the item types, whatever order the teacher ticked them in.
    expect(formData.getAll('allowedTypes')).toEqual(['SingleChoice', 'Essay']);
    expect(formData.get('instructions')).toBe('Sin preguntas de memoria.');
    expect(formData.get('sourceText')).toBe('Las plantas producen oxígeno.');
    expect(formData.getAll('files').map((file) => (file as File).name)).toEqual(['guia.pdf', 'apuntes.txt']);
  });

  it('leaves out empty optional fields', () => {
    const formData = buildGenerateFormData(values(), []);

    expect([...formData.keys()]).toEqual([
      'topic',
      'itemCount',
      'difficulty',
      'allowedTypes',
      'allowedTypes',
      'allowedTypes',
      'allowedTypes',
    ]);
    expect(formData.get('itemCount')).toBe('10');
    expect(formData.get('difficulty')).toBe('Intermediate');
  });
});

describe('validateValues', () => {
  it('accepts the defaults with a topic', () => {
    expect(validateValues(values())).toEqual({});
  });

  it('reports each rule next to its field, in Spanish', () => {
    expect(
      validateValues(
        values({
          topic: '   ',
          level: 'x'.repeat(101),
          itemCount: '31',
          allowedTypes: [],
          instructions: 'x'.repeat(2001),
          sourceText: 'x'.repeat(50_001),
        }),
      ),
    ).toEqual({
      topic: 'Escribe el tema de la evaluación.',
      level: 'El nivel o curso puede tener hasta 100 caracteres.',
      itemCount: 'Pide entre 1 y 30 preguntas.',
      allowedTypes: 'Elige al menos un tipo de pregunta.',
      instructions: 'Las indicaciones pueden tener hasta 2000 caracteres.',
      sourceText: 'El texto pegado puede tener hasta 50.000 caracteres.',
    });
  });

  it.each(['0', '2.5', '', 'diez'])('rejects %j questions', (itemCount) => {
    expect(validateValues(values({ itemCount })).itemCount).toBe('Pide entre 1 y 30 preguntas.');
  });
});
