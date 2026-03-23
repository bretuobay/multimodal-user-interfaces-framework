/**
 * TC39 Observable-compatible implementation.
 * ~100 lines, zero deps, exposes [Symbol.observable] for RxJS interop.
 */
export interface Observer<T> {
    next(value: T): void;
    error(err: unknown): void;
    complete(): void;
}
export interface Subscription {
    readonly closed: boolean;
    unsubscribe(): void;
}
export type SubscriberFunction<T> = (observer: Observer<T>) => (() => void) | void;
declare global {
    interface SymbolConstructor {
        readonly observable: unique symbol;
    }
}
export declare class Observable<T> {
    private readonly _subscriber;
    constructor(_subscriber: SubscriberFunction<T>);
    subscribe(observer?: Partial<Observer<T>>): Subscription;
    /** TC39 interop — allows `from(observable)` in RxJS and other libraries */
    [Symbol.observable](): Observable<T>;
    /** Map operator */
    map<U>(fn: (value: T) => U): Observable<U>;
    /** Filter operator */
    filter(predicate: (value: T) => boolean): Observable<T>;
    /** Take first N values then complete */
    take(n: number): Observable<T>;
    /** Convert to async iterable */
    [Symbol.asyncIterator](): AsyncIterator<T>;
    /** Static: create from a promise */
    static from<T>(promise: Promise<T>): Observable<T>;
    /** Static: emit values and complete */
    static of<T>(...values: T[]): Observable<T>;
    /** Static: never emits */
    static never<T = never>(): Observable<T>;
    /** Static: immediately errors */
    static throw<T = never>(err: unknown): Observable<T>;
}
//# sourceMappingURL=observable.d.ts.map