/**
 * Channel — duplex streaming primitive built on WHATWG Streams.
 * Provides backpressure, composable piping, and Observable observation.
 */

import { Observable } from './observable.js';
import { Signal, type ReadonlySignal } from './signal.js';
import type { Observer } from './observable.js';

export type ChannelStatus =
  | 'idle'
  | 'open'
  | 'paused'
  | 'closed'
  | 'errored';

export interface ChannelFrame<T> {
  readonly id: string;
  readonly timestamp: number;
  readonly data: T;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface ChannelOptions {
  id?: string;
  highWaterMark?: number;
  metadata?: Record<string, unknown>;
}

let _frameCounter = 0;

export function createFrame<T>(
  data: T,
  metadata?: Record<string, unknown>,
): ChannelFrame<T> {
  return {
    id: `frame-${++_frameCounter}`,
    timestamp: Date.now(),
    data,
    metadata,
  };
}

export interface ChannelSendOptions {
  metadata?: Record<string, unknown>;
}

/**
 * A duplex streaming channel.
 * - `source.readable` — read frames produced by this channel
 * - `sink.writable` — write frames into this channel
 * - `send()` — convenience method for writing a single frame
 */
export class Channel<In, Out = In> {
  readonly id: string;

  private readonly _status: Signal<ChannelStatus>;
  private readonly _error: Signal<unknown | null>;
  private readonly _observers = new Set<Partial<Observer<ChannelFrame<Out>>>>();
  private _sourceController: ReadableStreamDefaultController<
    ChannelFrame<Out>
  > | null = null;

  readonly source: { readable: ReadableStream<ChannelFrame<Out>> };
  readonly sink: { writable: WritableStream<ChannelFrame<In>> };

  private _paused = false;
  private _pauseResolver: (() => void) | null = null;

  constructor(options: ChannelOptions = {}) {
    this.id = options.id ?? `channel-${Math.random().toString(36).slice(2)}`;
    this._status = new Signal<ChannelStatus>('idle');
    this._error = new Signal<unknown | null>(null);

    this.source = {
      readable: new ReadableStream<ChannelFrame<Out>>(
        {
          start: (controller) => {
            this._sourceController = controller;
          },
          cancel: () => {
            this._sourceController = null;
          },
        },
        new CountQueuingStrategy({ highWaterMark: options.highWaterMark ?? 16 }),
      ),
    };

    this.sink = {
      writable: new WritableStream<ChannelFrame<In>>({
        write: async (frame) => {
          await this._sendFrame({
            id: frame.id,
            timestamp: frame.timestamp,
            data: frame.data as unknown as Out,
            metadata: frame.metadata,
          });
        },
      }),
    };
  }

  get status(): ReadonlySignal<ChannelStatus> {
    return this._status;
  }

  get error(): ReadonlySignal<unknown | null> {
    return this._error;
  }

  async open(): Promise<void> {
    if (this._status.value !== 'idle') return;
    this._status.set('open');
  }

  pause(): void {
    if (this._status.value !== 'open') return;
    this._paused = true;
    this._status.set('paused');
  }

  resume(): void {
    if (this._status.value !== 'paused') return;
    this._paused = false;
    this._status.set('open');
    this._pauseResolver?.();
    this._pauseResolver = null;
  }

  async close(reason?: string): Promise<void> {
    if (this._status.value === 'closed' || this._status.value === 'errored')
      return;
    this._status.set('closed');
    try {
      this._sourceController?.close();
    } catch {
      // already closed
    } finally {
      this._sourceController = null;
    }
    if (reason) {
      this._error.set(new Error(reason));
    }
    this._completeObservers();
  }

  /** Write a frame to the channel's outbound (source) side */
  async send(data: Out, options?: ChannelSendOptions): Promise<void> {
    await this._sendFrame(createFrame(data, options?.metadata));
  }

  private async _sendFrame(frame: ChannelFrame<Out>): Promise<void> {
    if (this._status.value === 'closed' || this._status.value === 'errored') {
      throw new Error(`Cannot send on a ${this._status.value} channel`);
    }
    if (this._paused) {
      await new Promise<void>((resolve) => {
        this._pauseResolver = resolve;
      });
    }
    try {
      this._sourceController?.enqueue(frame);
    } catch (error) {
      this._error.set(error);
      this._status.set('errored');
      this._errorObservers(error);
      throw error;
    }

    for (const observer of this._observers) {
      observer.next?.(frame);
    }
  }

  /** Observe outbound frames as an Observable */
  observe(): Observable<ChannelFrame<Out>> {
    return new Observable<ChannelFrame<Out>>((observer) => {
      if (
        this._status.value === 'closed' ||
        this._status.value === 'errored'
      ) {
        observer.complete();
        return;
      }

      this._observers.add(observer);
      return () => {
        this._observers.delete(observer);
      };
    });
  }

  /**
   * Pipe outbound frames through a TransformStream to produce a new Channel.
   * Returns a fresh Channel that emits transformed frames.
   */
  pipe<NewOut>(transform: TransformStream<Out, NewOut>): Channel<In, NewOut> {
    const downstream = new Channel<In, NewOut>();
    const sourceReader = this.source.readable.getReader();
    const transformWriter = transform.writable.getWriter();
    const transformReader = transform.readable.getReader();

    void (async () => {
      try {
        while (true) {
          const { done, value } = await sourceReader.read();
          if (done) break;
          await transformWriter.write(value.data);
        }
        await transformWriter.close();
      } catch (error) {
        await transformWriter.abort(error).catch(() => {});
        await downstream.close(String(error)).catch(() => {});
      } finally {
        sourceReader.releaseLock();
      }
    })();

    void (async () => {
      try {
        while (true) {
          const { done, value } = await transformReader.read();
          if (done) break;
          await downstream.send(value);
        }
        await downstream.close();
      } catch (error) {
        await downstream.close(String(error)).catch(() => {});
      } finally {
        transformReader.releaseLock();
      }
    })();

    return downstream;
  }

  private _completeObservers(): void {
    for (const observer of this._observers) {
      observer.complete?.();
    }
    this._observers.clear();
  }

  private _errorObservers(error: unknown): void {
    for (const observer of this._observers) {
      observer.error?.(error);
    }
    this._observers.clear();
  }
}

/** Factory */
export function createChannel<In, Out = In>(
  options?: ChannelOptions,
): Channel<In, Out> {
  return new Channel<In, Out>(options);
}
