import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AssignmentFormState } from '../schemas';
import { AssignmentForm } from './assignment-form';

const originalTimeZone = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'America/Santiago';
});
afterAll(() => {
  process.env.TZ = originalTimeZone;
});

const ASSESSMENT_ID = '01a16b52-e9ac-7a33-8ab0-573e71b464f5';
const COURSE_ID = '01a16b52-e9f4-7677-b5b2-95c6705b8fef';

function setup(result: AssignmentFormState = {}) {
  const submitted: Record<string, string>[] = [];
  const action = async (_state: AssignmentFormState, formData: FormData) => {
    submitted.push(Object.fromEntries([...formData.entries()].map(([key, value]) => [key, String(value)])));
    return result;
  };
  render(
    <AssignmentForm
      action={action}
      submitLabel="Asignar"
      pendingLabel="Asignando…"
      now={new Date('2026-09-05T15:20:00-04:00')}
      target={{
        fixed: { field: 'assessmentId', id: ASSESSMENT_ID },
        choose: { field: 'workspaceId', label: 'Curso', options: [{ id: COURSE_ID, label: '4° medio A' }] },
      }}
    />,
  );
  return { user: userEvent.setup(), submitted };
}

describe('AssignmentForm', () => {
  it('starts open now, without a close date, 45 minutes, Metis on at level 2 and results hidden', async () => {
    const { user, submitted } = setup();

    expect(screen.getByRole('radio', { name: 'Ahora' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Sin fecha de cierre' })).toBeChecked();
    expect(screen.getByLabelText('Duración en minutos')).toHaveValue(45);
    expect(screen.getByRole('switch', { name: 'Metis puede ayudar en esta evaluación' })).toBeChecked();
    expect(screen.getByRole('radio', { name: /2\. Pistas/ })).toBeChecked();
    expect(
      screen.getByRole('switch', { name: 'Los estudiantes ven su resultado al entregar' }),
    ).not.toBeChecked();
    expect(screen.queryByLabelText('Fecha y hora de apertura')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Curso'), COURSE_ID);
    await user.click(screen.getByRole('button', { name: 'Asignar' }));

    expect(submitted).toEqual([
      expect.objectContaining({
        assessmentId: ASSESSMENT_ID,
        workspaceId: COURSE_ID,
        opensMode: 'now',
        opensAt: '',
        dueMode: 'none',
        dueAt: '',
        durationMinutes: '45',
        assistantEnabled: 'on',
        maxHelpLevel: '2',
      }),
    ]);
    expect(submitted[0]).not.toHaveProperty('resultsVisible');
  });

  it('sends the chosen dates as ISO with the offset of each side of the daylight saving change', async () => {
    const { user, submitted } = setup();

    await user.click(screen.getAllByRole('radio', { name: 'En una fecha y hora' })[0]!);
    const opens = screen.getByLabelText('Fecha y hora de apertura');
    // The suggested opening is the next full hour after the form opened.
    expect(opens).toHaveValue('2026-09-05T16:00');
    // jsdom has no date picker to type into; the browser fires the same change event.
    fireEvent.change(opens, { target: { value: '2026-09-05T23:00' } });

    await user.click(screen.getAllByRole('radio', { name: 'En una fecha y hora' })[1]!);
    fireEvent.change(screen.getByLabelText('Fecha y hora de cierre'), {
      target: { value: '2026-09-06T09:00' },
    });

    await user.click(screen.getByRole('button', { name: 'Asignar' }));

    expect(submitted[0]).toMatchObject({
      opensMode: 'at',
      opensAt: '2026-09-05T23:00:00-04:00',
      dueMode: 'at',
      dueAt: '2026-09-06T09:00:00-03:00',
    });
  });

  it('hides the help level when Metis is off but keeps the choice for later', async () => {
    const { user, submitted } = setup();

    await user.click(screen.getByRole('radio', { name: /3\. Ejemplos parciales/ }));
    await user.click(screen.getByRole('switch', { name: 'Metis puede ayudar en esta evaluación' }));
    expect(screen.queryByRole('radio', { name: /Pistas/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Asignar' }));
    expect(submitted[0]).toMatchObject({ maxHelpLevel: '3' });
    expect(submitted[0]).not.toHaveProperty('assistantEnabled');
  });

  it('shows the errors next to their fields and keeps what was chosen', async () => {
    const { user } = setup({
      fieldErrors: {
        dueAt: ['El cierre tiene que ser después de la apertura.'],
        workspaceId: ['Elige un curso.'],
      },
    });

    await user.click(screen.getAllByRole('radio', { name: 'En una fecha y hora' })[1]!);
    await user.click(screen.getByRole('button', { name: 'Asignar' }));

    expect(await screen.findByText('El cierre tiene que ser después de la apertura.')).toBeVisible();
    expect(screen.getByLabelText('Fecha y hora de cierre')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Elige un curso.')).toBeVisible();
    expect(screen.getAllByRole('radio', { name: 'En una fecha y hora' })[1]).toBeChecked();
  });
});

describe('AssignmentForm with submissions', () => {
  it('shows the opening, the duration and Metis disabled, and explains why', () => {
    render(
      <AssignmentForm
        action={async () => ({})}
        submitLabel="Guardar cambios"
        pendingLabel="Guardando…"
        now={new Date('2026-09-05T15:20:00-04:00')}
        initial={{
          opensAt: '2026-09-05T12:00:00Z',
          dueAt: '2026-09-08T12:00:00Z',
          durationMinutes: 45,
          assistantEnabled: true,
          maxHelpLevel: 2,
          assistantInstructions: null,
        }}
        submissionCount={3}
      />,
    );

    expect(screen.getByText(/Ya hay 3 rendiciones/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Ahora' })).toBeDisabled();
    expect(screen.getByLabelText('Fecha y hora de apertura')).toBeDisabled();
    expect(screen.getByLabelText('Duración en minutos')).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Metis puede ayudar en esta evaluación' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /2\. Pistas/ })).toBeDisabled();
    // The close date stays editable, and only moves later.
    expect(screen.getByLabelText('Fecha y hora de cierre')).toBeEnabled();
    expect(screen.getByRole('radio', { name: 'Sin fecha de cierre' })).toBeEnabled();
    expect(screen.getByText('Solo una fecha posterior a la actual.')).toBeInTheDocument();
  });
});
