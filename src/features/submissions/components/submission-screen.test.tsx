import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { StudentSubmission } from '../contract';
import { SubmissionScreen } from './submission-screen';

// Stable like Next's router: a new object per render would re-run the effects that depend on it.
const { refresh, router } = vi.hoisted(() => {
  const refresh = vi.fn();
  return { refresh, router: { refresh } };
});
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// Only the clock: the fetch responses resolve through microtasks, which stay real.
const FAKED = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] as const;
const SHARE_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAA';
const ids = [
  '0190a000-0000-7000-8000-000000000001',
  '0190a000-0000-7000-8000-000000000002',
  '0190a000-0000-7000-8000-000000000003',
];

function submission(deadlineInMs: number, responses: StudentSubmission['responses'] = []): StudentSubmission {
  const now = Date.now();
  return {
    status: 'InProgress',
    assessmentTitle: 'Ciencias: repaso',
    instructions: null,
    items: [
      {
        id: ids[0]!,
        position: 1,
        type: 'SingleChoice',
        prompt: '¿Capital de Chile?',
        points: 2,
        minWords: null,
        maxWords: null,
        metisAvailable: true,
        options: [
          { key: 'a', text: 'Lima' },
          { key: 'b', text: 'Santiago' },
        ],
      },
      {
        id: ids[1]!,
        position: 2,
        type: 'TrueFalse',
        prompt: 'El agua hierve a 100 °C.',
        points: 1,
        minWords: null,
        maxWords: null,
        metisAvailable: false,
        options: null,
      },
      {
        id: ids[2]!,
        position: 3,
        type: 'Essay',
        prompt: 'Explica la fotosíntesis.',
        points: 4,
        minWords: null,
        maxWords: 5,
        metisAvailable: true,
        options: null,
      },
    ],
    responses,
    startedAt: new Date(now - 60_000).toISOString(),
    deadline: new Date(now + deadlineInMs).toISOString(),
    serverNow: new Date(now).toISOString(),
    submittedAt: null,
  };
}

type Route = (init: RequestInit | undefined) => { status: number; body: unknown };

function stubApi(routes: Partial<Record<'read' | 'save' | 'submit', Route>>) {
  const calls: { url: string; method: string; body?: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      calls.push({ url, method, ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}) });
      const route = url.endsWith('/respuestas') ? 'save' : url.endsWith('/entrega') ? 'submit' : 'read';
      const { status, body } = routes[route]?.(init) ?? { status: 500, body: {} };
      return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    }),
  );
  return calls;
}

beforeEach(() => {
  refresh.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('SubmissionScreen', () => {
  it('shows one question at a time, moves focus to the new prompt and marks answered questions in the grid', async () => {
    const data = submission(30 * 60_000, [{ itemId: ids[1]!, response: { value: true }, updatedAt: null }]);
    stubApi({ read: () => ({ status: 200, body: data }) });
    const user = userEvent.setup();
    render(<SubmissionScreen shareToken={SHARE_TOKEN} submission={data} />);

    expect(screen.getByRole('heading', { name: '¿Capital de Chile?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Anterior/ })).toBeDisabled();
    expect(screen.getByText('1 de 3 respondidas')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Siguiente/ }));
    const prompt = screen.getByRole('heading', { name: 'El agua hierve a 100 °C.' });
    expect(prompt).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Verdadero' })).toBeChecked(); // restored from the saved responses

    const panel = screen.getByRole('complementary', { name: 'Todas las preguntas' });
    expect(panel.querySelector('[aria-label="Pregunta 2, respondida"]')).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(panel.querySelector('[aria-label="Pregunta 1, sin responder"]')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(screen.getByRole('heading', { name: 'Explica la fotosíntesis.' })).toHaveFocus();
    expect(screen.getByRole('button', { name: /Siguiente/ })).toBeDisabled();
  });

  it('says how many questions are unanswered before submitting', async () => {
    const data = submission(30 * 60_000);
    stubApi({ read: () => ({ status: 200, body: data }) });
    const user = userEvent.setup();
    render(<SubmissionScreen shareToken={SHARE_TOKEN} submission={data} />);

    await user.click(screen.getByText('Santiago'));
    await user.click(screen.getByRole('button', { name: 'Entregar' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'Te quedan 2 preguntas sin responder: valen 0 puntos si entregas ahora.',
    );
  });

  it('saves what is pending and submits by itself when the time runs out', async () => {
    vi.useFakeTimers({ toFake: [...FAKED] });
    const data = submission(8_000);
    const calls = stubApi({
      read: () => ({ status: 200, body: data }),
      save: () => ({
        status: 200,
        body: {
          status: 'InProgress',
          deadline: data.deadline,
          serverNow: new Date().toISOString(),
          responses: [],
        },
      }),
      submit: () => ({ status: 200, body: { status: 'Submitted', submittedAt: data.deadline } }),
    });
    render(<SubmissionScreen shareToken={SHARE_TOKEN} submission={data} />);

    // Answered 6 s before the deadline: saved right away, then submitted when the timer reaches 0.
    await act(() => vi.advanceTimersByTimeAsync(2_000));
    await act(async () => screen.getByText('Santiago').click());
    await act(() => vi.advanceTimersByTimeAsync(4_500));
    const save = calls.find((call) => call.method === 'PUT');
    expect(save?.body).toEqual({ responses: [{ itemId: ids[0], response: { selectedKey: 'b' } }] });

    await act(() => vi.advanceTimersByTimeAsync(3_000));
    expect(
      calls.some((call) => call.method === 'POST' && call.url === `/rendir/${SHARE_TOKEN}/sesion/entrega`),
    ).toBe(true);
    expect(refresh).toHaveBeenCalled();
  });

  it('corrects the timer with the server clock', async () => {
    vi.useFakeTimers({ toFake: [...FAKED] });
    // The device is 2 minutes ahead of the server: 10 server minutes are left, not 8.
    const data = submission(8 * 60_000);
    const serverNow = new Date(Date.now() - 2 * 60_000).toISOString();
    stubApi({ read: () => ({ status: 200, body: { ...data, serverNow } }) });
    render(<SubmissionScreen shareToken={SHARE_TOKEN} submission={{ ...data, serverNow }} />);
    await act(() => vi.advanceTimersByTimeAsync(1_000));

    expect(screen.getByRole('timer')).toHaveAccessibleName('Quedan 10 minutos');
  });

  it('stops and says so when the access key no longer works (another device took over)', async () => {
    const data = submission(30 * 60_000);
    stubApi({ read: () => ({ status: 404, body: { status: 404 } }) });
    render(<SubmissionScreen shareToken={SHARE_TOKEN} submission={data} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esta evaluación se abrió en otro dispositivo',
    );
    expect(screen.getByRole('button', { name: 'Entregar' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Santiago' })).toBeDisabled();
  });

  it('keeps an essay over its word limit out of the autosave and warns about it', async () => {
    vi.useFakeTimers({ toFake: [...FAKED] });
    const data = submission(30 * 60_000);
    const calls = stubApi({ read: () => ({ status: 200, body: data }) });
    render(<SubmissionScreen shareToken={SHARE_TOKEN} submission={data} />);

    await act(async () => screen.getByRole('button', { name: /Siguiente/ }).click());
    await act(async () => screen.getByRole('button', { name: /Siguiente/ }).click());
    const essay = screen.getByLabelText('Tu respuesta');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
      setter.call(essay, 'uno dos tres cuatro cinco seis');
      essay.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(() => vi.advanceTimersByTimeAsync(3_000));

    expect(
      screen.getByText('Tu respuesta tiene más de 5 palabras. Acórtala para que se pueda guardar.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Una respuesta supera el máximo de palabras y no se guarda')).toBeInTheDocument();
    expect(calls.some((call) => call.method === 'PUT')).toBe(false);
  });
});
