import { MESSAGES } from '../errors';
import { failureFor, GENERATE_MESSAGES } from './request';

describe('failureFor', () => {
  it('names the file that is too large, or speaks of all the materials when there is none', () => {
    expect(failureFor(413, { status: 413, fileName: 'libro.pdf', errors: { files: ['…'] } })).toEqual({
      ok: false,
      message: GENERATE_MESSAGES.tooLarge('libro.pdf'),
      fieldErrors: {},
      fileName: 'libro.pdf',
    });
    expect(failureFor(413, { status: 413, detail: 'The upload can be up to 40 MB.' })).toEqual({
      ok: false,
      message: 'Los materiales son demasiado extensos. Quita algún archivo o acorta el texto pegado.',
      fieldErrors: {},
    });
  });

  it('names the file metis-api could not read', () => {
    const failure = failureFor(415, { status: 415, fileName: 'programa.pdf' });

    expect(failure.message).toBe(
      'No pudimos leer «programa.pdf». Revisa que sea PDF, una imagen, Word, PowerPoint, Excel, OpenDocument, RTF o texto, y que no esté dañado ni protegido con contraseña.',
    );
    expect(failure.fileName).toBe('programa.pdf');
  });

  it('explains the hourly limit and a failed generation', () => {
    expect(failureFor(429, { status: 429 }).message).toBe(
      'Alcanzaste el límite de borradores por hora. Intenta más tarde.',
    );
    expect(failureFor(502, { title: 'AI generation failed' }).message).toBe(
      'Metis no pudo generar el borrador. Intenta de nuevo o cambia los materiales.',
    );
    // The proxy answers 502 too when metis-api does not answer in time.
    expect(failureFor(502, { title: 'metis-api is unavailable' }).message).toBe(GENERATE_MESSAGES.failed);
  });

  it('puts a 400 next to the fields it names and never shows the API text', () => {
    expect(
      failureFor(400, {
        detail: 'Topic is required.',
        errors: { topic: ['Topic is required.'], itemCount: ['…'], unknown: ['…'] },
      }),
    ).toEqual({
      ok: false,
      message: MESSAGES.invalid,
      fieldErrors: {
        topic: 'Revisa el tema: es obligatorio y puede tener hasta 300 caracteres.',
        itemCount: 'Pide entre 1 y 30 preguntas.',
      },
    });
  });
});
