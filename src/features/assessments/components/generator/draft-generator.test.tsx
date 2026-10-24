import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AssessmentDraft } from '../../contract';
import type { GenerateResult } from '../../generator/request';
import type { ActionResult, DraftToSave } from '../../schemas';
import { DraftGenerator } from './draft-generator';

// The static import of Metis's illustration is a plain string under Vitest, which next/image rejects.
vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

const draft: AssessmentDraft = {
  title: 'Evaluación de ejemplo: fotosíntesis',
  instructions: 'Responde las preguntas.',
  items: [
    {
      type: 'SingleChoice',
      prompt: '¿Qué gas liberan las plantas?',
      points: 1,
      options: [
        { text: 'Oxígeno', isCorrect: true },
        { text: 'Nitrógeno', isCorrect: false },
      ],
      isTrue: null,
      minWords: null,
      maxWords: null,
      teacherNotes: 'Las plantas liberan oxígeno.',
      assistantEnabled: true,
      studentHint: 'Piensa en lo que respiras.',
    },
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
  ],
  notices: ['Metis está en modo de ejemplo: este borrador no se generó con IA ni se basó en tus materiales.'],
  aiGenerated: false,
};

/** A generator the test answers by hand, to see the wait screen and to cancel it. */
function controlledGenerator() {
  const calls: { formData: FormData; signal: AbortSignal; resolve: (result: GenerateResult) => void }[] = [];
  const generate = (formData: FormData, signal: AbortSignal) =>
    new Promise<GenerateResult>((resolve) => {
      calls.push({ formData, signal, resolve });
      signal.addEventListener('abort', () =>
        resolve({ ok: false, aborted: true, message: 'Cancelaste la generación.', fieldErrors: {} }),
      );
    });
  return { calls, generate };
}

function setup({ aiAvailable = true as boolean | null, saveResult = { ok: true } as ActionResult } = {}) {
  const { calls, generate } = controlledGenerator();
  const saved: DraftToSave[] = [];
  const save = async (input: DraftToSave) => {
    saved.push(input);
    return saveResult;
  };
  render(<DraftGenerator aiAvailable={aiAvailable} save={save} generate={generate} />);
  return { user: userEvent.setup(), calls, saved };
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Tema'), 'La fotosíntesis');
  await user.click(screen.getByRole('button', { name: 'Generar borrador' }));
}

describe('DraftGenerator', () => {
  it('validates the form before sending anything', async () => {
    const { user, calls } = setup();

    await user.click(screen.getByLabelText('Verdadero o falso'));
    await user.click(screen.getByLabelText('Selección única'));
    await user.click(screen.getByLabelText('Selección múltiple'));
    await user.click(screen.getByLabelText('Respuesta abierta'));
    await user.click(screen.getByRole('button', { name: 'Generar borrador' }));

    expect(screen.getByText('Escribe el tema de la evaluación.')).toBeVisible();
    expect(screen.getByText('Elige al menos un tipo de pregunta.')).toBeVisible();
    expect(calls).toHaveLength(0);
  });

  it('checks the files in the browser and lets the teacher remove one', async () => {
    const { user } = setup();
    const input = screen.getByLabelText('Elegir archivos');

    await user.upload(input, [
      new File(['%PDF-1.4'], 'guia.pdf', { type: 'application/pdf' }),
      new File(['apuntes'], 'apuntes.txt', { type: 'text/plain' }),
    ]);
    // `accept` hides it from the picker; a dropped file still reaches the check.
    await userEvent.setup({ applyAccept: false }).upload(input, new File(['MZ'], 'programa.exe'));

    const list = screen.getByRole('list', { name: 'Archivos para Metis' });
    expect(within(list).getByText('guia.pdf')).toBeVisible();
    expect(within(list).getByText('apuntes.txt')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'programa.exe: Metis no puede leer este formato. Sube PDF, imágenes, Word, PowerPoint, Excel, OpenDocument, RTF o texto.',
    );

    await user.click(screen.getByRole('button', { name: 'Quitar guia.pdf' }));
    expect(within(list).queryByText('guia.pdf')).not.toBeInTheDocument();
    expect(within(list).getByText('apuntes.txt')).toBeVisible();
  });

  it('shows the wait, then the draft with its notices, and saves the questions the teacher kept', async () => {
    const { user, calls, saved } = setup();
    await user.upload(screen.getByLabelText('Elegir archivos'), new File(['apuntes'], 'apuntes.txt'));
    await fillAndSubmit(user);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Metis está preparando tu borrador. Puede tardar hasta un minuto.',
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(calls[0]!.formData.get('topic')).toBe('La fotosíntesis');
    expect((calls[0]!.formData.get('files') as File).name).toBe('apuntes.txt');

    calls[0]!.resolve({ ok: true, draft });

    expect(await screen.findByRole('heading', { name: 'Revisa el borrador' })).toHaveFocus();
    expect(screen.getByRole('region', { name: 'Avisos de Metis' })).toHaveTextContent(draft.notices[0]!);
    expect(screen.getByRole('heading', { name: '1. ¿Qué gas liberan las plantas?' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Quitar la pregunta 1 del borrador' }));
    expect(screen.queryByText('¿Qué gas liberan las plantas?')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1. La clorofila es verde.' })).toBeVisible();

    await user.clear(screen.getByLabelText('Título'));
    await user.type(screen.getByLabelText('Título'), 'Fotosíntesis, 7° A');
    await user.click(screen.getByRole('button', { name: 'Crear borrador' }));

    expect(saved).toEqual([
      { title: 'Fotosíntesis, 7° A', instructions: 'Responde las preguntas.', items: [draft.items[1]] },
    ]);
  });

  it('keeps the form after an error and marks the file metis-api could not read', async () => {
    const { user, calls } = setup();
    await user.upload(screen.getByLabelText('Elegir archivos'), new File(['MZ'], 'programa.pdf'));
    await fillAndSubmit(user);

    calls[0]!.resolve({
      ok: false,
      message: 'No pudimos leer «programa.pdf».',
      fieldErrors: {},
      fileName: 'programa.pdf',
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos leer «programa.pdf».');
    expect(screen.getByLabelText('Tema')).toHaveValue('La fotosíntesis');
    expect(screen.getByText(/Metis no pudo usar este archivo/)).toBeVisible();
  });

  it('cancels the generation, aborting the request, and keeps what the teacher typed', async () => {
    const { user, calls } = setup();
    await fillAndSubmit(user);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(calls[0]!.signal.aborted).toBe(true);
    expect(screen.getByRole('status')).toHaveTextContent('Cancelaste la generación. Tus datos siguen aquí.');
    expect(screen.getByLabelText('Tema')).toHaveValue('La fotosíntesis');
  });

  it('returns to the same form with "Volver a generar"', async () => {
    const { user, calls } = setup();
    await user.clear(screen.getByLabelText('Cantidad de preguntas'));
    await user.type(screen.getByLabelText('Cantidad de preguntas'), '5');
    await fillAndSubmit(user);
    calls[0]!.resolve({ ok: true, draft });

    await user.click(await screen.findByRole('button', { name: 'Volver a generar' }));

    expect(screen.getByLabelText('Tema')).toHaveValue('La fotosíntesis');
    expect(screen.getByLabelText('Cantidad de preguntas')).toHaveValue(5);
  });

  it('asks before leaving while a draft is under review', async () => {
    const { user, calls } = setup();
    await fillAndSubmit(user);

    const before = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(before);
    expect(before.defaultPrevented).toBe(false);

    calls[0]!.resolve({ ok: true, draft });
    await screen.findByRole('heading', { name: 'Revisa el borrador' });

    const during = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(during);
    expect(during.defaultPrevented).toBe(true);
  });

  it('shows the save error and keeps the draft', async () => {
    const { user, calls } = setup({ saveResult: { ok: false, message: 'No pudimos conectar con Metis.' } });
    await fillAndSubmit(user);
    calls[0]!.resolve({ ok: true, draft });

    await user.click(await screen.findByRole('button', { name: 'Crear borrador' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar con Metis.');
    expect(screen.getByRole('heading', { name: '1. ¿Qué gas liberan las plantas?' })).toBeVisible();
  });

  it('says when Metis is in sample mode', () => {
    setup({ aiAvailable: false });
    expect(
      screen.getByText('Metis está en modo de ejemplo: el borrador no se basará en tus materiales.'),
    ).toBeVisible();
  });
});
