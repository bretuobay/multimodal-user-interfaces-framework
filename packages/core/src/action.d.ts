/**
 * Action — a cancellable async unit of work with streaming progress.
 * Uses AbortSignal for cancellation; emits progress via Observable.
 */
import { Observable } from './observable.js';
import { type ReadonlySignal } from './signal.js';
export type ActionStatus = 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
export interface ActionProgress<T = unknown> {
    readonly percent?: number;
    readonly partial?: T;
    readonly message?: string;
}
export interface ActionDefinition<T, P = ActionProgress<T>> {
    readonly type: string;
    execute(signal: AbortSignal, emit: (progress: P) => void): Promise<T> | AsyncGenerator<P, T>;
}
export declare class Action<T> {
    readonly id: string;
    readonly type: string;
    readonly signal: AbortSignal;
    private readonly _status;
    private readonly _result;
    private readonly _error;
    private readonly _abortController;
    private readonly _progressListeners;
    constructor(id: string, type: string);
    get status(): ReadonlySignal<ActionStatus>;
    get result(): ReadonlySignal<T | undefined>;
    get error(): ReadonlySignal<unknown | null>;
    cancel(reason?: string): void;
    observe(): Observable<ActionProgress<T>>;
    /**
     * Returns a Promise that resolves with the action's result or rejects on failure/cancellation.
     * NOTE: This is NOT named `then` to avoid the JavaScript thenable trap — if an Action had
     * a `.then` method, `await action` would unwrap the result instead of the Action instance.
     */
    toPromise(): Promise<T>;
    /** Internal: called by ActionRunner to update state */
    _setRunning(): void;
    _emitProgress(progress: ActionProgress<T>): void;
    _setCompleted(result: T): void;
    _setFailed(error: unknown): void;
}
/** Execute an ActionDefinition and return the Action handle */
export declare function runAction<T>(definition: ActionDefinition<T>, signal?: AbortSignal): Promise<Action<T>>;
/** Create an action without running it */
export declare function createAction<T>(type: string): Action<T>;
//# sourceMappingURL=action.d.ts.map