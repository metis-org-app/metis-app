import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RosterEntry } from '../../contract';
import { RosterSection } from './roster-section';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const ASSIGNMENT_ID = '01a170a6-4e53-719b-80f7-16326f66e907';
let next = 0;
const uuid = () => `01a170a6-0000-7000-8000-${String(++next).padStart(12, '0')}`;

const entry = (studentName: string, overrides: Partial<RosterEntry> = {}): RosterEntry => ({
  studentId: uuid(),
  studentName,
  studentEmail: `${studentName.toLowerCase()}@colegio.test`,
  submissionId: null,
  status: 'NotStarted',
  score: null,
  isScoreProvisional: false,
  maxScore: null,
  startedAt: null,
  submittedAt: null,
  deadline: null,
  pendingReviewCount: 0,
  resumeAllowed: false,
  ...overrides,
});

const submittedAt = '2026-10-24T22:30:00Z';
const ana = entry('Ana', {
  submissionId: uuid(),
  status: 'Submitted',
  score: 6,
  isScoreProvisional: true,
  maxScore: 13,
  submittedAt,
  pendingReviewCount: 2,
});
const roster = [
  ana,
  entry('Beto', { submissionId: uuid(), status: 'Graded', score: 13, maxScore: 13, submittedAt }),
  entry('Camila', { submissionId: uuid(), status: 'InProgress' }),
  entry('Diego'),
];

const rows = () => within(screen.getByRole('list', { name: 'Estudiantes' })).getAllByRole('listitem');

describe('RosterSection', () => {
  it('lists the whole roster with each state, score and answers to review', () => {
    render(<RosterSection assignmentId={ASSIGNMENT_ID} roster={roster} />);

    expect(rows()).toHaveLength(4);
    const first = within(rows()[0]!);
    expect(first.getByText('Entregada')).toBeInTheDocument();
    expect(first.getByText('6 de 13')).toBeInTheDocument();
    expect(first.getByText(/provisional/)).toBeInTheDocument();
    expect(first.getByText('2 respuestas por revisar')).toBeInTheDocument();
    expect(first.getByRole('link', { name: 'Revisar la rendición de Ana' })).toHaveAttribute(
      'href',
      `/asignaciones/${ASSIGNMENT_ID}/rendiciones/${ana.submissionId}#por-revisar`,
    );
    expect(within(rows()[1]!).getByText('Corregida')).toBeInTheDocument();
    expect(within(rows()[1]!).getByRole('link', { name: 'Ver la rendición de Beto' })).toBeInTheDocument();
    expect(within(rows()[2]!).getByText('En curso')).toBeInTheDocument();
    // Without a submission there is nothing to open.
    expect(within(rows()[3]!).getByText('No ha empezado')).toBeInTheDocument();
    expect(within(rows()[3]!).queryByRole('link')).not.toBeInTheDocument();

    expect(screen.getByRole('status')).toHaveTextContent('Quedan 2 respuestas por revisar en 1 rendición.');
  });

  it('filters by state and by answers to review', async () => {
    const user = userEvent.setup();
    render(<RosterSection assignmentId={ASSIGNMENT_ID} roster={roster} />);

    await user.click(screen.getByRole('radio', { name: /Por revisar/ }));
    expect(rows().map((row) => within(row).getByText(/^(Ana|Beto|Camila|Diego)$/).textContent)).toEqual([
      'Ana',
    ]);

    await user.click(screen.getByRole('radio', { name: /No ha empezado/ }));
    expect(rows()).toHaveLength(1);
    expect(within(rows()[0]!).getByText('Diego')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Todos/ }));
    expect(rows()).toHaveLength(4);
  });

  it('says when nothing matches and when nothing is left to review', async () => {
    const user = userEvent.setup();
    render(<RosterSection assignmentId={ASSIGNMENT_ID} roster={[entry('Diego')]} />);

    expect(screen.getByRole('status')).toHaveTextContent('No hay respuestas por revisar.');
    await user.click(screen.getByRole('radio', { name: /Corregida/ }));
    expect(screen.getByText('Ningún estudiante en este estado.')).toBeInTheDocument();
  });

  it('reads the roster again with "Actualizar"', async () => {
    const user = userEvent.setup();
    render(<RosterSection assignmentId={ASSIGNMENT_ID} roster={roster} />);

    await user.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(refresh).toHaveBeenCalled();
  });
});
