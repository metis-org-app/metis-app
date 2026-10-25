import { ResponseQueue, type QueueStatus, type ResponseChange, type SendOutcome } from './response-queue';

type Call = {
  changes: ResponseChange[];
  resolve: (outcome: SendOutcome) => void;
  reject: (error: unknown) => void;
};

function setup(delay = 1_500) {
  const calls: Call[] = [];
  const statuses: QueueStatus[] = [];
  const queue = new ResponseQueue({
    delay,
    onStatus: (status) => statuses.push(status),
    send: (changes) =>
      new Promise<SendOutcome>((resolve, reject) => {
        calls.push({ changes, resolve, reject });
      }),
  });
  const last = () => statuses.at(-1);
  return { queue, calls, last };
}

const saved: SendOutcome = { kind: 'saved' };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('ResponseQueue', () => {
  it('groups the changes of several items and sends them 1.5 s after the last one, the latest answer winning', async () => {
    const { queue, calls, last } = setup();

    queue.set('a', { selectedKey: 'a' });
    await vi.advanceTimersByTimeAsync(1_000);
    queue.set('b', { value: true });
    queue.set('a', { selectedKey: 'c' });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(calls).toHaveLength(0);
    expect(last()).toEqual({ state: 'pending', unsaved: 2 });

    await vi.advanceTimersByTimeAsync(500);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.changes).toEqual([
      { itemId: 'a', response: { selectedKey: 'c' } },
      { itemId: 'b', response: { value: true } },
    ]);
    expect(last()).toEqual({ state: 'saving', unsaved: 2 });

    calls[0]!.resolve(saved);
    await vi.advanceTimersByTimeAsync(0);
    expect(last()).toEqual({ state: 'saved', unsaved: 0 });
  });

  it('never sends two saves at once and sends a change made during a save right after it', async () => {
    const { queue, calls, last } = setup();

    queue.set('a', { text: 'uno' });
    await vi.advanceTimersByTimeAsync(1_500);
    queue.set('a', { text: 'uno dos' });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(calls).toHaveLength(1);

    calls[0]!.resolve(saved);
    await vi.advanceTimersByTimeAsync(0);
    // The first save ended, but a newer answer is waiting: not "saved" yet.
    expect(last()).toEqual({ state: 'pending', unsaved: 1 });

    await vi.advanceTimersByTimeAsync(1_500);
    expect(calls[1]!.changes).toEqual([{ itemId: 'a', response: { text: 'uno dos' } }]);
    calls[1]!.resolve(saved);
    await vi.advanceTimersByTimeAsync(0);
    expect(last()).toEqual({ state: 'saved', unsaved: 0 });
  });

  it('retries a failed save with backoff and keeps a newer answer over the failed one', async () => {
    const { queue, calls, last } = setup();

    queue.set('a', { selectedKey: 'a' });
    queue.set('b', { value: false });
    await vi.advanceTimersByTimeAsync(1_500);
    queue.set('a', { selectedKey: 'b' }); // changed while the request is in flight
    calls[0]!.resolve({ kind: 'retry' });
    await vi.advanceTimersByTimeAsync(0);
    expect(last()).toEqual({ state: 'retrying', unsaved: 2 });

    await vi.advanceTimersByTimeAsync(1_999);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls[1]!.changes).toEqual([
      { itemId: 'a', response: { selectedKey: 'b' } },
      { itemId: 'b', response: { value: false } },
    ]);

    calls[1]!.resolve({ kind: 'retry' });
    await vi.advanceTimersByTimeAsync(3_999);
    expect(calls).toHaveLength(2); // the second wait doubles to 4 s
    await vi.advanceTimersByTimeAsync(1);
    calls[2]!.resolve(saved);
    await vi.advanceTimersByTimeAsync(0);
    expect(last()).toEqual({ state: 'saved', unsaved: 0 });
  });

  it('reports "offline" when the request cannot be made and sends at once when the connection comes back', async () => {
    const { queue, calls, last } = setup();

    queue.set('a', { text: 'sin red' });
    await vi.advanceTimersByTimeAsync(1_500);
    calls[0]!.reject(new TypeError('Failed to fetch'));
    await vi.advanceTimersByTimeAsync(0);
    expect(last()).toEqual({ state: 'offline', unsaved: 1 });

    // Answered while offline: kept for the retry, not lost and not sent on its own.
    queue.set('b', { value: true });
    await vi.advanceTimersByTimeAsync(1_500);
    expect(calls).toHaveLength(1);
    expect(last()).toEqual({ state: 'offline', unsaved: 2 });

    void queue.flush(); // the `online` event
    expect(calls[1]!.changes).toEqual([
      { itemId: 'a', response: { text: 'sin red' } },
      { itemId: 'b', response: { value: true } },
    ]);
    calls[1]!.resolve(saved);
    await vi.advanceTimersByTimeAsync(0);
    expect(last()).toEqual({ state: 'saved', unsaved: 0 });
  });

  it('stops for good when the submission is closed and keeps what was not saved', async () => {
    const { queue, calls, last } = setup();

    queue.set('a', { value: true });
    await vi.advanceTimersByTimeAsync(1_500);
    calls[0]!.resolve({ kind: 'closed' });
    await vi.advanceTimersByTimeAsync(0);
    expect(last()).toEqual({ state: 'closed', unsaved: 1 });

    queue.set('b', { value: false });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls).toHaveLength(1);
  });

  it('keeps a blocked item out of the saves until it changes again', async () => {
    const { queue, calls, last } = setup();

    queue.set('essay', { text: 'demasiadas palabras' }, false);
    await vi.advanceTimersByTimeAsync(1_500);
    expect(calls).toHaveLength(0);
    expect(last()).toEqual({ state: 'blocked', unsaved: 1 });

    queue.set('essay', { text: 'corta' });
    await vi.advanceTimersByTimeAsync(1_500);
    expect(calls[0]!.changes).toEqual([{ itemId: 'essay', response: { text: 'corta' } }]);
  });

  it('drains everything before submitting, skipping the debounce', async () => {
    const { queue, calls } = setup();

    queue.set('a', { selectedKey: 'a' });
    const drained = queue.drain();
    expect(calls).toHaveLength(1);
    calls[0]!.resolve(saved);
    await expect(drained).resolves.toBe(true);
  });

  it('does not report a drain as complete while an item is blocked', async () => {
    const { queue, calls, last } = setup();

    queue.set('a', { value: true });
    queue.set('essay', { text: 'demasiadas palabras' }, false);
    const drained = queue.drain();
    calls[0]!.resolve(saved);
    await expect(drained).resolves.toBe(false);
    expect(last()).toEqual({ state: 'blocked', unsaved: 1 });
  });

  it('removes a response by sending null', async () => {
    const { queue, calls } = setup();

    queue.set('a', null);
    await vi.advanceTimersByTimeAsync(1_500);
    expect(calls[0]!.changes).toEqual([{ itemId: 'a', response: null }]);
  });
});
