/**
 * Channel — duplex streaming primitive built on WHATWG Streams.
 * Provides backpressure, composable piping, and Observable observation.
 */
import { Observable } from './observable.js';
import { type ReadonlySignal } from './signal.js';
export type ChannelStatus = 'idle' | 'open' | 'paused' | 'closed' | 'errored';
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
export declare function createFrame<T>(data: T, metadata?: Record<string, unknown>): ChannelFrame<T>;
export interface ChannelSendOptions {
    metadata?: Record<string, unknown>;
}
/**
 * A duplex streaming channel.
 * - `source.readable` — read frames produced by this channel
 * - `sink.writable` — write frames into this channel
 * - `send()` — convenience method for writing a single frame
 */
export declare class Channel<In, Out = In> {
    readonly id: string;
    private readonly _status;
    private readonly _error;
    private readonly _controller;
    private readonly _transform;
    private readonly _inboundTransform;
    readonly source: {
        readable: ReadableStream<ChannelFrame<Out>>;
    };
    readonly sink: {
        writable: WritableStream<ChannelFrame<In>>;
    };
    private _paused;
    private _pauseResolver;
    constructor(options?: ChannelOptions);
    get status(): ReadonlySignal<ChannelStatus>;
    get error(): ReadonlySignal<unknown | null>;
    open(): Promise<void>;
    pause(): void;
    resume(): void;
    close(reason?: string): Promise<void>;
    /** Write a frame to the channel's outbound (source) side */
    send(data: Out, options?: ChannelSendOptions): Promise<void>;
    /** Observe outbound frames as an Observable */
    observe(): Observable<ChannelFrame<Out>>;
    /**
     * Pipe through a TransformStream to produce a new Channel.
     * The returned channel emits transformed frames.
     */
    pipe<NewOut>(transform: TransformStream<Out, NewOut>): PipedChannel<In, NewOut>;
}
/** A Channel whose output is transformed via a TransformStream */
declare class PipedChannel<In, Out> extends Channel<In, Out> {
    constructor(source: Channel<In, unknown>, transform: TransformStream<unknown, Out>);
    private get _error();
}
/** Factory */
export declare function createChannel<In, Out = In>(options?: ChannelOptions): Channel<In, Out>;
export {};
//# sourceMappingURL=channel.d.ts.map