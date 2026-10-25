import type { ApiAnswer } from './contract';

export type ResponseChange = { itemId: string; response: ApiAnswer | null };

/** How one save ended, as the queue needs to know it. */
export type SendOutcome =
  | { kind: 'saved' }
  /** No connection (fetch failed or the browser is offline): retried, and right away when the connection is back. */
  | { kind: 'offline' }
  /** A temporary failure (429, 5xx, a concurrent write): retried with backoff. */
  | { kind: 'retry' }
  /** metis-api rejected a response (400). Retrying the same data cannot help: it waits for a new change or a retry. */
  | { kind: 'invalid' }
  /** The submission no longer accepts responses (submitted, time up, assignment closed). Final. */
  | { kind: 'closed' }
  /** The access key is gone (another device took over, or the cookie expired). Final. */
  | { kind: 'session' };

export type QueueState =
  'saved' | 'pending' | 'saving' | 'offline' | 'retrying' | 'invalid' | 'blocked' | 'closed' | 'session';

export type QueueStatus = {
  state: QueueState;
  /** Items whose latest answer is not stored yet (pending, in flight or blocked). */
  unsaved: number;
};

type Options = {
  send: (changes: ResponseChange[]) => Promise<SendOutcome>;
  onStatus: (status: QueueStatus) => void;
  /** Debounce after the last change; ~1.5 s while answering, 0 in the last seconds. */
  delay?: number;
};

const FIRST_RETRY_MS = 2_000;
const MAX_RETRY_MS = 30_000;

/**
 * Autosave of a submission's responses. Changes are grouped per item (the latest answer wins) and sent together a
 * short while after the last one. Never two saves at once; a change made while a save runs is sent right after it.
 * A failed save puts its changes back without overwriting newer ones, and is retried automatically. An item can be
 * blocked (an essay over its word limit): it stays out of the saves, and the status says so, until it changes again.
 */
export class ResponseQueue {
  private readonly pending = new Map<string, ApiAnswer | null>();
  private readonly blocked = new Set<string>();
  private inFlight: Map<string, ApiAnswer | null> | null = null;
  private inFlightPromise: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private retryDelay = 0;
  private lastFailure: 'offline' | 'retry' | 'invalid' | null = null;
  private final: 'closed' | 'session' | null = null;
  private delay: number;

  constructor(private readonly options: Options) {
    this.delay = options.delay ?? 1_500;
  }

  get status(): QueueStatus {
    const unsaved = new Set([...this.pending.keys(), ...(this.inFlight?.keys() ?? []), ...this.blocked]).size;
    const state: QueueState = this.final
      ? this.final
      : this.inFlight
        ? 'saving'
        : this.lastFailure === 'offline'
          ? 'offline'
          : this.lastFailure === 'retry'
            ? 'retrying'
            : this.lastFailure === 'invalid'
              ? 'invalid'
              : this.pending.size > 0
                ? 'pending'
                : this.blocked.size > 0
                  ? 'blocked'
                  : 'saved';
    return { state, unsaved };
  }

  /** The latest answer of an item. `sendable: false` keeps it out of the saves (and the stored answer as it was). */
  set(itemId: string, response: ApiAnswer | null, sendable = true) {
    if (this.final) return;
    if (sendable) {
      this.blocked.delete(itemId);
      this.pending.set(itemId, response);
    } else {
      this.pending.delete(itemId);
      this.blocked.add(itemId);
    }
    if (this.lastFailure === 'invalid') this.lastFailure = null;
    // While a retry is scheduled the change waits for it; otherwise it starts (or restarts) the debounce.
    if (this.lastFailure === null) this.schedule(this.delay);
    this.emit();
  }

  setDelay(delay: number) {
    this.delay = delay;
  }

  /** Sends what is pending now, skipping the debounce (the "Reintentar" button, a connection that came back). */
  flush(): Promise<void> {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (this.final) return Promise.resolve();
    if (this.inFlightPromise) return this.inFlightPromise;
    if (this.pending.size === 0) return Promise.resolve();
    this.inFlightPromise = this.sendPending().finally(() => {
      this.inFlightPromise = null;
    });
    return this.inFlightPromise;
  }

  /**
   * Saves everything that can be saved before submitting: waits for the running save and sends what is left, a few
   * times at most. Resolves true only when nothing is left unsaved, blocked items included: submitting then would
   * silently keep their previous answer.
   */
  async drain(): Promise<boolean> {
    for (let attempt = 0; attempt < 3 && !this.final; attempt += 1) {
      if (this.inFlightPromise) await this.inFlightPromise;
      if (this.pending.size === 0) break;
      this.lastFailure = null;
      await this.flush();
    }
    return this.pending.size === 0 && this.inFlight === null && this.blocked.size === 0;
  }

  stop() {
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private schedule(delay: number) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), delay);
  }

  private async sendPending() {
    const batch = new Map(this.pending);
    this.pending.clear();
    this.inFlight = batch;
    this.emit();

    let outcome: SendOutcome;
    try {
      outcome = await this.options.send([...batch].map(([itemId, response]) => ({ itemId, response })));
    } catch {
      outcome = { kind: 'offline' };
    }
    this.inFlight = null;

    switch (outcome.kind) {
      case 'saved':
        this.retryDelay = 0;
        this.lastFailure = null;
        break;
      case 'closed':
      case 'session':
        this.restore(batch);
        this.final = outcome.kind;
        break;
      case 'offline':
      case 'retry':
        this.restore(batch);
        this.lastFailure = outcome.kind;
        this.retryDelay = Math.min(Math.max(FIRST_RETRY_MS, this.retryDelay * 2), MAX_RETRY_MS);
        this.schedule(this.retryDelay);
        break;
      case 'invalid':
        this.restore(batch);
        this.lastFailure = 'invalid';
        break;
    }

    // Changes made while saving go out after the usual pause.
    if (outcome.kind === 'saved' && this.pending.size > 0) this.schedule(this.delay);
    this.emit();
  }

  // A newer answer of the same item (or a block) wins over the one that failed to save.
  private restore(batch: Map<string, ApiAnswer | null>) {
    for (const [itemId, response] of batch) {
      if (!this.pending.has(itemId) && !this.blocked.has(itemId)) this.pending.set(itemId, response);
    }
  }

  private emit() {
    this.options.onStatus(this.status);
  }
}
