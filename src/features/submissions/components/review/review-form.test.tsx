import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseReview } from '../../schemas';
import { ReviewForm } from './review-form';

const reviewItemAction = vi.fn();
vi.mock('../../actions', () => ({
  reviewItemAction: (...args: unknown[]) => reviewItemAction(...args),
}));

const target = {
  assignmentId: '01a170a6-4e53-719b-80f7-16326f66e907',
  submissionId: '01a170a6-4e53-719b-80f7-000000000001',
  itemId: '01a170a6-4e53-719b-80f7-000000000002',
  points: 4,
  pointsText: '4',
};

describe('parseReview', () => {
  const parse = (score: string, feedback = '') => parseReview({ score, feedback }, 4, '4');

  it('accepts a score from 0 to the points with up to 2 decimals, also with a comma', () => {
    expect(parse('0')).toEqual({ success: true, data: { score: 0, feedback: null } });
    expect(parse('4')).toMatchObject({ data: { score: 4 } });
    expect(parse('2,75', ' Bien ')).toEqual({ success: true, data: { score: 2.75, feedback: 'Bien' } });
  });

  it('rejects a score out of range, with 3 decimals, negative or empty', () => {
    for (const score of ['4.01', '5', '1.255', '-1', '', 'dos']) {
      expect(parse(score)).toEqual({
        success: false,
        fieldErrors: { score: ['Escribe un puntaje entre 0 y 4, con hasta 2 decimales.'] },
      });
    }
  });

  it('rejects a comment over 2000 characters', () => {
    expect(parse('3', 'a'.repeat(2001))).toMatchObject({
      success: false,
      fieldErrors: { feedback: [expect.any(String)] },
    });
  });
});

describe('ReviewForm', () => {
  beforeEach(() => reviewItemAction.mockReset());

  it('is open for a pending essay and shows the error next to the score', async () => {
    reviewItemAction.mockResolvedValue({
      values: { score: '9', feedback: '' },
      fieldErrors: { score: ['Escribe un puntaje entre 0 y 4, con hasta 2 decimales.'] },
    });
    const user = userEvent.setup();
    render(<ReviewForm target={target} mode="pending" initial={{ score: '', feedback: '' }} />);

    await user.type(screen.getByLabelText('Puntaje'), '9');
    await user.click(screen.getByRole('button', { name: 'Guardar revisión' }));

    expect(
      await screen.findByText('Escribe un puntaje entre 0 y 4, con hasta 2 decimales.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Puntaje')).toHaveAttribute('aria-invalid', 'true');
    expect(reviewItemAction).toHaveBeenCalledWith(target, expect.anything(), expect.any(FormData));
  });

  it('closes after saving and says so', async () => {
    reviewItemAction.mockResolvedValue({ ok: true, values: { score: '3', feedback: 'Bien' } });
    const user = userEvent.setup();
    render(<ReviewForm target={target} mode="pending" initial={{ score: '', feedback: '' }} />);

    await user.type(screen.getByLabelText('Puntaje'), '3');
    await user.click(screen.getByRole('button', { name: 'Guardar revisión' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Revisión guardada');
    expect(screen.queryByLabelText('Puntaje')).not.toBeInTheDocument();
  });

  it('keeps an automatic score behind "Corregir puntaje", prefilled', async () => {
    const user = userEvent.setup();
    render(<ReviewForm target={target} mode="auto" initial={{ score: '2', feedback: '' }} />);

    expect(screen.queryByLabelText('Puntaje')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Corregir puntaje' }));
    expect(screen.getByLabelText('Puntaje')).toHaveValue('2');

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByLabelText('Puntaje')).not.toBeInTheDocument();
  });
});
