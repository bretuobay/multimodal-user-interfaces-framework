/**
 * Channel — duplex streaming primitive built on WHATWG Streams.
 * Provides backpressure, composable piping, and Observable observation.
 */

import { Observable } from './observable.js';
import { Signal, type ReadonlySignal } from './signal.js';

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

  // Internal stream pair: writable side receives frames, readable side emits them
  private readonly _controller: TransformStreamDefaultController<
    ChannelFrame<Out>
  >;
  private readonly _transform: TransformStream<ChannelFrame<Out>, ChannelFrame<Out>>;

  // Inbound (sink) side — external writers push ChannelFrame<In> here
  private readonly _inboundTransform: TransformStream<
    ChannelFrame<In>,
    ChannelFrame<In>
  >;

  readonly source: { readable: ReadableStream<ChannelFrame<Out>> };
  readonly sink: { writable: WritableStream<ChannelFrame<In>> };

  private _paused = false;
  private _pauseResolver: (() => void) | null = null;

  constructor(options: ChannelOptions = {}) {
    this.id = options.id ?? `channel-${Math.random().toString(36).slice(2)}`;
    this._status = new Signal<ChannelStatus>('idle');
    this._error = new Signal<unknown | null>(null);

    // Build the outbound transform stream (identity by default; can be replaced via pipe)
    let ctrl!: TransformStreamDefaultController<ChannelFrame<Out>>;
    this._transform = new TransformStream<ChannelFrame<Out>, ChannelFrame<Out>>(
      {
        start: (c) => {
          ctrl = c;
        },
        transform: (chunk, controller) => {
          controller.enqueue(chunk);
        },
      },
      new CountQueuingStrategy({ highWaterMark: options.highWaterMark ?? 16 }),
    );
    this._controller = ctrl;

    // Build the inbound transform stream
    this._inboundTransform = new TransformStream<
      ChannelFrame<In>,
      ChannelFrame<In>
    >({
      transform: (chunk, controller) => {
        controller.enqueue(chunk);
      },
    });

    this.source = { readable: this._transform.readable };
    this.sink = { writable: this._inboundTransform.writable };
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
      this._controller.terminate();
    } catch {
      // already closed
    }
    if (reason) {
      this._error.set(new Error(reason));
    }
  }

  /** Write a frame to the channel's outbound (source) side */
  async send(data: Out, options?: ChannelSendOptions): Promise<void> {
    if (this._status.value === 'closed' || this._status.value === 'errored') {
      throw new Error(`Cannot send on a ${this._status.value} channel`);
    }
    if (this._paused) {
      await new Promise<void>((resolve) => {
        this._pauseResolver = resolve;
      });
    }
    const frame = createFrame(data, options?.metadata);
    this._controller.enqueue(frame as unknown as ChannelFrame<Out>);
  }

  /** Observe outbound frames as an Observable */
  observe(): Observable<ChannelFrame<Out>> {
    return new Observable<ChannelFrame<Out>>((observer) => {
      const reader = this._transform.readable.getReader();
      let active = true;

      const pump = (): void => {
        if (!active) return;
        reader
          .read()
          .then(({ done, value }) => {
            if (done || !active) {
              observer.complete();
              return;
            }
            observer.next(value);
            pump();
          })
          .catch((e: unknown) => observer.error(e));
      };

      pump();

      return () => {
        active = false;
        reader.cancel().catch(() => {});
      };
    });
  }

  /**
   * Pipe outbound frames through a TransformStream to produce a new Channel.
   * Returns a fresh Channel that emits transformed frames.
   */
  pipe<NewOut>(transform: TransformStream<Out, NewOut>): Channel<In, NewOut> {
    const downstream = new Channel<In, NewOut>();

    // Start piping: source.readable → transform → downstream.send()
    this.source.readable
      .pipeThrough(
        new TransformStream<ChannelFrame<Out>, ChannelFrame<NewOut>>({
          transform: async (frame, controller) => {
            // Apply the user's transform on the raw data
            const writer = transform.writable.getWriter();
            const reader = transform.readable.getReader();
            await writer.write(frame.data);
            await writer.close();
            const { value } = await reader.read();
            if (value !== undefined) {
              controller.enqueue(createFrame(value, frame.metadata));
            }
          },
        }),
      )
      .pipeTo(
        new WritableStream<ChannelFrame<NewOut>>({
          write: async (frame) => {
            await downstream.send(frame.data, { metadata: frame.metadata as Record<string, unknown> });
          },
          close: () => {
            downstream.close().catch(() => {});
          },
          abort: (reason: unknown) => {
            downstream.close(String(reason)).catch(() => {});
          },
        }),
      )
      .catch(() => {});

    return downstream;
  }
}

/** Factory */
export function createChannel<In, Out = In>(
  options?: ChannelOptions,
): Channel<In, Out> {
  return new Channel<In, Out>(options);
}
