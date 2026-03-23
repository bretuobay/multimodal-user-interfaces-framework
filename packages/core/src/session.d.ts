/**
 * Session — bounded lifecycle container grouping Channels and state.
 * Interruptible, resumable, terminatable.
 */
import { Channel, type ChannelOptions } from './channel.js';
import { Signal, type ReadonlySignal } from './signal.js';
import { Action, type ActionDefinition, type ActionStatus } from './action.js';
export type SessionStatus = 'created' | 'active' | 'suspended' | 'terminated' | 'error';
export interface SessionEventMap {
    'channel:added': {
        channelId: string;
    };
    'channel:removed': {
        channelId: string;
    };
    'action:dispatched': {
        actionId: string;
        type: string;
    };
    'action:completed': {
        actionId: string;
        result: unknown;
    };
    'action:failed': {
        actionId: string;
        error: unknown;
    };
    'action:cancelled': {
        actionId: string;
    };
    'status:changed': {
        from: SessionStatus;
        to: SessionStatus;
    };
    error: {
        error: unknown;
    };
}
export interface SessionOptions {
    id?: string;
    metadata?: Record<string, unknown>;
}
export declare class Session {
    readonly id: string;
    readonly metadata: Readonly<Record<string, unknown>>;
    private readonly _status;
    private readonly _state;
    private readonly _channels;
    private readonly _actions;
    private readonly _bus;
    constructor(options?: SessionOptions);
    get status(): ReadonlySignal<SessionStatus>;
    get state(): Signal<Record<string, unknown>>;
    start(): Promise<void>;
    suspend(): Promise<void>;
    resume(): Promise<void>;
    terminate(reason?: string): Promise<void>;
    addChannel<In, Out = In>(id: string, options?: ChannelOptions): Channel<In, Out>;
    getChannel<In, Out = In>(id: string): Channel<In, Out> | undefined;
    removeChannel(id: string): Promise<void>;
    get channelIds(): string[];
    dispatch<T>(definition: ActionDefinition<T>): Action<T>;
    cancelAction(actionId: string, reason?: string): void;
    on<K extends keyof SessionEventMap>(event: K, handler: (payload: SessionEventMap[K]) => void): () => void;
    once<K extends keyof SessionEventMap>(event: K, handler: (payload: SessionEventMap[K]) => void): () => void;
    private _transition;
}
/** Factory */
export declare function createSession(options?: SessionOptions): Session;
/** Represents the ActionStatus type for external consumers */
export type { ActionStatus };
//# sourceMappingURL=session.d.ts.map