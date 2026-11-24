/*
 * Sample answers for the development session (see dev-session.ts): the owners work on the app without signing in,
 * and the development session has no metis-api behind it. Only reached when isDevSession is true, which cannot
 * happen in production. The shapes are the metis-api response schemas (docs/metis-api/operations.md); every call
 * site validates them with those schemas, so a drift fails loudly.
 */

const SAMPLE_NOTICE =
  'Metis está en modo de ejemplo: este borrador no se generó con IA ni se basó en tus materiales.';

type SampleType = 'SingleChoice' | 'MultipleChoice' | 'TrueFalse' | 'Essay';

const SAMPLE_TYPES: SampleType[] = ['SingleChoice', 'MultipleChoice', 'TrueFalse', 'Essay'];

const POINTS: Record<SampleType, number> = { SingleChoice: 1, MultipleChoice: 2, TrueFalse: 1, Essay: 4 };

const PROMPTS: Record<SampleType, string[]> = {
  SingleChoice: ['¿Qué describe mejor «{t}»?', '¿Cuál de estas opciones es correcta sobre «{t}»?'],
  MultipleChoice: ['¿Qué elementos forman parte de «{t}»?', 'Marca las afirmaciones correctas sobre «{t}».'],
  TrueFalse: [
    '«{t}» se puede explicar con causas y consecuencias.',
    '«{t}» no tiene relación con lo visto en clases.',
  ],
  Essay: [
    'Explica con tus palabras qué es «{t}» y por qué es importante.',
    'Desarrolla una respuesta sobre «{t}» que incluya un ejemplo.',
  ],
};

function sampleItem(type: SampleType, variant: number, topic: string): Record<string, unknown> {
  const base = {
    prompt: PROMPTS[type][variant % PROMPTS[type].length]!.replace('{t}', topic),
    points: POINTS[type],
    teacherNotes: null,
    assistantEnabled: true,
    studentHint: null,
  };
  switch (type) {
    case 'SingleChoice':
      return {
        ...base,
        definition: {
          type,
          options: [
            { text: 'El concepto central del tema.', isCorrect: true },
            { text: 'Algo que no se relaciona con el tema.', isCorrect: false },
            { text: 'Una opinión personal sin fundamentos.', isCorrect: false },
            { text: 'Un dato que no cambia el resultado.', isCorrect: false },
          ],
        },
        teacherNotes: 'Busca la opción que nombra la idea principal.',
        studentHint: 'Descarta lo que no se relaciona con el tema.',
      };
    case 'MultipleChoice':
      return {
        ...base,
        definition: {
          type,
          options: [
            { text: 'El concepto principal del tema.', isCorrect: true },
            { text: 'Un ejemplo que lo ilustra.', isCorrect: true },
            { text: 'Algo que no se relaciona con el tema.', isCorrect: false },
            { text: 'Una idea que contradice el tema.', isCorrect: false },
          ],
        },
        studentHint: 'Hay dos opciones correctas.',
      };
    case 'TrueFalse':
      return { ...base, definition: { type, isTrue: variant % 2 === 0 } };
    case 'Essay':
      return {
        ...base,
        definition: { type, minWords: 50, maxWords: 150 },
        teacherNotes: 'Una buena respuesta define el tema y termina con un ejemplo.',
      };
  }
}

/** The sample draft of POST /api/assessments/generate, echoing the topic the teacher typed. */
export async function devGenerateDraft(formData: FormData): Promise<unknown> {
  const topic = String(formData.get('topic') ?? '').trim() || 'el tema';
  const rawCount = Number(formData.get('itemCount'));
  const count = Number.isFinite(rawCount)
    ? Math.min(30, Math.max(1, Math.trunc(rawCount)))
    : SAMPLE_TYPES.length;
  const requested = formData
    .getAll('allowedTypes')
    .map(String)
    .filter((type): type is SampleType => (SAMPLE_TYPES as string[]).includes(type));
  const types = requested.length > 0 ? requested : SAMPLE_TYPES;
  const items = Array.from({ length: count }, (_, index) => {
    const type = types[index % types.length]!;
    return sampleItem(type, Math.floor(index / types.length), topic);
  });
  // A pause so the wait screen and the animated entrance of the cards can be seen in development.
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return {
    title: `Evaluación: ${topic}`,
    instructions: null,
    items,
    notices: [SAMPLE_NOTICE],
    aiGenerated: false,
  };
}

type DevStore = Map<string, unknown>;

/** The saved sample assessments, keyed by id. globalThis keeps one map across the compiled bundles of dev. */
function store(): DevStore {
  const global = globalThis as typeof globalThis & { __devAssessments?: DevStore };
  return (global.__devAssessments ??= new Map());
}

/**
 * Sample answers for the assessment endpoints of the creation flow (create and load one), so "Crear borrador"
 * saves and opens the editor. Undefined keeps the empty-list / "not found" behavior of the development session.
 */
export function devApiStub(method: string, path: string, body: unknown): unknown | undefined {
  if (method === 'POST' && path === '/api/assessments') return saveAssessment(body);
  const saved = /^\/api\/assessments\/([^/]+)$/.exec(path);
  if (method === 'GET' && saved) return store().get(saved[1]!);
  return undefined;
}

/**
 * Like the real create: the draft items get ids and positions, the option keys of their definition are "a", "b",
 * "c"..., and an essay without word limits gets them as null.
 */
function saveAssessment(body: unknown): unknown {
  const data = (body ?? {}) as {
    title?: unknown;
    instructions?: unknown;
    generatedWithAi?: unknown;
    items?: unknown;
  };
  const rawItems: unknown[] = Array.isArray(data.items) ? data.items : [];
  const items = rawItems.map((raw, index): Record<string, unknown> => {
    const { definition, ...fields } = (raw ?? {}) as Record<string, unknown>;
    return {
      id: crypto.randomUUID(),
      position: index + 1,
      ...fields,
      definition: savedDefinition(definition),
    };
  });
  const totalPoints = items.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
  const now = new Date().toISOString();
  const assessment = {
    id: crypto.randomUUID(),
    title: typeof data.title === 'string' ? data.title : 'Evaluación',
    instructions: typeof data.instructions === 'string' ? data.instructions : null,
    status: 'Draft',
    generatedWithAi: data.generatedWithAi === true,
    itemCount: items.length,
    totalPoints,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    items,
  };
  store().set(assessment.id, assessment);
  return assessment;
}

/** A definition as metis-api stores it: options keyed by position, and an essay's missing word limits as null. */
function savedDefinition(raw: unknown): unknown {
  const definition = (raw ?? {}) as Record<string, unknown>;
  if (Array.isArray(definition.options)) {
    return {
      ...definition,
      options: definition.options.map((option, position) => ({
        key: String.fromCharCode(97 + position),
        ...(option as Record<string, unknown>),
      })),
    };
  }
  if (definition.type === 'Essay') {
    return { ...definition, minWords: definition.minWords ?? null, maxWords: definition.maxWords ?? null };
  }
  return definition;
}
