/**
 * Minimal Signal implementation.
 * TC39 Signals proposal-compatible naming; own implementation to avoid dep risk.
 * ~150 lines.
 */
import { Observable } from './observable.js';
export interface ReadonlySignal<T> {
    readonly value: T;
    /** Read without tracking (no subscription side-effect) */
    peek(): T;
    /** Observe changes as an Observable */
    observe(): Observable<T>;
}
export interface SignalOptions<T> {
    /** Custom equality function; defaults to Object.is */
    equals?: (a: T, b: T) => boolean;
    debugLabel?: string;
}
export declare class Signal<T> implements ReadonlySignal<T> {
    private _value;
    private readonly _equals;
    private readonly _listeners;
    constructor(initialValue: T, options?: SignalOptions<T>);
    get value(): T;
    peek(): T;
    set(value: T): void;
    update(fn: (current: T) => T): void;
    observe(): Observable<T>;
    private _notify;
}
/**
 * A derived (computed) signal whose value is derived from other signals.
 * Re-evaluates lazily when read after any dependency changes.
 */
export declare class ComputedSignal<T> implements ReadonlySignal<T> {
    private readonly _compute;
    private _value;
    private _dirty;
    private readonly _equals;
    private readonly _listeners;
    private readonly _deps;
    private readonly _subscriptions;
    constructor(_compute: () => T, deps: Array<ReadonlySignal<unknown>>, options?: SignalOptions<T>);
    get value(): T;
    peek(): T;
    observe(): Observable<T>;
    dispose(): void;
    private _invalidate;
    private _recompute;
}
/** Factory helpers */
export declare function createSignal<T>(initialValue: T, options?: SignalOptions<T>): Signal<T>;
export declare function createComputed<T>(compute: () => T, deps: Array<ReadonlySignal<unknown>>, options?: SignalOptions<T>): ComputedSignal<T>;
//# sourceMappingURL=signal.d.ts.map