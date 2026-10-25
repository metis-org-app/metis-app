import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { START_MESSAGES } from '../messages';
import type { StartFormState } from '../schemas';
import { StartForm } from './start-form';

const startSubmissionAction =
  vi.fn<(token: string, previous: StartFormState, data: FormData) => Promise<StartFormState>>();
vi.mock('../actions', () => ({
  startSubmissionAction: (...args: Parameters<typeof startSubmissionAction>) =>
    startSubmissionAction(...args),
}));

async function submitWith(email: string) {
  const user = userEvent.setup();
  render(<StartForm shareToken="AAAAAAAAAAAAAAAAAAAAAA" durationLabel="30 minutos" />);
  await user.type(screen.getByLabelText('Tu email'), email);
  await user.click(screen.getByRole('button', { name: 'Empezar' }));
}

describe('StartForm', () => {
  it('says how long the student has and that the time keeps running before starting', () => {
    render(<StartForm shareToken="AAAAAAAAAAAAAAAAAAAAAA" durationLabel="30 minutos" />);
    expect(screen.getByText(/Tienes 30 minutos desde que empieces/)).toBeInTheDocument();
    expect(
      screen.getByText('Cuando empieces, el tiempo corre aunque cierres la página.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ingresa con el email que te registró tu profesor.')).toBeInTheDocument();
  });

  it('shows "not on the roster" next to the email', async () => {
    startSubmissionAction.mockResolvedValue({
      values: { email: 'nadie@colegio.cl' },
      fieldErrors: { email: [START_MESSAGES.notOnRoster] },
    });
    await submitWith('nadie@colegio.cl');

    const email = await screen.findByLabelText('Tu email');
    expect(await screen.findByText(START_MESSAGES.notOnRoster)).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveValue('nadie@colegio.cl');
  });

  it('announces a submission already started elsewhere as a form error', async () => {
    startSubmissionAction.mockResolvedValue({
      values: { email: 'ana@colegio.cl' },
      message: START_MESSAGES.alreadyStarted,
    });
    await submitWith('ana@colegio.cl');

    expect(await screen.findByRole('alert')).toHaveTextContent(START_MESSAGES.alreadyStarted);
  });
});
