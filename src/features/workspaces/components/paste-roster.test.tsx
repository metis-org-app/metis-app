import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RosterResult, StudentInput } from '../schemas';
import { PasteRosterForm } from './paste-roster';

function setup(result: RosterResult = { ok: true, added: 1, alreadyEnrolled: [] }) {
  const uploads: StudentInput[][] = [];
  const onUpload = async (students: StudentInput[]) => {
    uploads.push(students);
    return result;
  };
  render(<PasteRosterForm onUpload={onUpload} onClose={() => {}} />);
  return { user: userEvent.setup(), uploads, textarea: screen.getByLabelText('Lista de estudiantes') };
}

describe('PasteRosterForm', () => {
  it('previews the pasted list and blocks the upload while a line is invalid', async () => {
    const { user, textarea } = setup();

    await user.click(textarea);
    await user.paste('Camila Rojas, camila@colegio.cl\nDiego, no-es-email\nCamila R., CAMILA@colegio.cl');

    expect(
      screen.getByRole('heading', { name: /1 estudiante listo para cargar · 2 líneas con problemas/ }),
    ).toBeVisible();
    expect(screen.getByText('El email no es válido.')).toBeVisible();
    expect(screen.getByText('Email repetido (también en la línea 1).')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Agregar 1 estudiante' })).toBeDisabled();
  });

  it('uploads the valid students and reports the ones already in the course', async () => {
    const { user, textarea, uploads } = setup({ ok: true, added: 1, alreadyEnrolled: ['diego@colegio.cl'] });

    await user.click(textarea);
    await user.paste('Camila Rojas\tcamila@colegio.cl\nDiego Soto\tdiego@colegio.cl');
    await user.click(screen.getByRole('button', { name: 'Agregar 2 estudiantes' }));

    expect(uploads).toEqual([
      [
        { name: 'Camila Rojas', email: 'camila@colegio.cl' },
        { name: 'Diego Soto', email: 'diego@colegio.cl' },
      ],
    ]);
    expect(await screen.findByText('Agregamos 1 estudiante.')).toBeVisible();
    expect(
      screen.getByText(/Este email ya estaba en el curso y no se duplicó: diego@colegio.cl/),
    ).toBeVisible();
  });

  it('keeps the list and shows the error when the upload fails', async () => {
    const { user, textarea } = setup({ ok: false, message: 'Hubo demasiados intentos seguidos.' });

    await user.click(textarea);
    await user.paste('Camila Rojas, camila@colegio.cl');
    await user.click(screen.getByRole('button', { name: 'Agregar 1 estudiante' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Hubo demasiados intentos seguidos.');
    expect(textarea).toHaveValue('Camila Rojas, camila@colegio.cl');
  });
});
