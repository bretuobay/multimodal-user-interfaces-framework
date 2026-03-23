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

export type SubscriberFunction<T> = (
  observer: Observer<T>,
) => (() => void) | void;

// Extend Symbol for TC39 proposal interop
declare global {
  interface SymbolConstructor {
    readonly observable: unique symbol;
  }
}

// Polyfill Symbol.observable if not present
if (typeof Symbol.observable === 'undefined') {
  Object.defineProperty(Symbol, 'observable', {
    value: Symbol('Symbol.observable'),
  });
}

class SafeObserver<T> implements Observer<T> {
  private _closed = false;
  private _cleanup: (() => void) | void = undefined;

  constructor(private readonly _observer: Partial<Observer<T>>) {}

  get closed(): boolean {
    return this._closed;
  }

  setCleanup(fn: (() => void) | void): void {
    this._cleanup = fn;
  }

  next(value: T): void {
    if (this._closed) return;
    try {
      this._observer.next?.(value);
    } catch {
      // swallow downstream errors
    }
  }

  error(err: unknown): void {
    if (this._closed) return;
    this._closed = true;
    try {
      if (this._observer.error) {
        this._observer.error(err);
      } else {
        throw err;
      }
    } finally {
      this._doCleanup();
    }
  }

  complete(): void {
    if (this._closed) return;
    this._closed = true;
    try {
      this._observer.complete?.();
    } finally {
      this._doCleanup();
    }
  }

  unsubscribe(): void {
    if (this._closed) return;
    this._closed = true;
    this._doCleanup();
  }

  private _doCleanup(): void {
    if (typeof this._cleanup === 'function') {
      try {
        this._cleanup();
      } catch {
        // swallow cleanup errors
      }
      this._cleanup = undefined;
    }
  }
}

export class Observable<T> {
  constructor(private readonly _subscriber: SubscriberFunction<T>) {}

  subscribe(observer: Partial<Observer<T>> = {}): Subscription {
    const safe = new SafeObserver<T>(observer);
    const cleanup = this._subscriber(safe);
    if (!safe.closed) {
      safe.setCleanup(cleanup);
    } else if (typeof cleanup === 'function') {
      // Subscriber completed/errored synchronously; run cleanup immediately
      try { cleanup(); } catch { /* swallow */ }
    }
    return {
      get closed() {
        return safe.closed;
      },
      unsubscribe() {
        safe.unsubscribe();
      },
    };
  }

  /** TC39 interop — allows `from(observable)` in RxJS and other libraries */
  [Symbol.observable](): Observable<T> {
    return this;
  }

  /** Map operator */
  map<U>(fn: (value: T) => U): Observable<U> {
    return new Observable<U>((observer) => {
      const sub = this.subscribe({
        next: (v) => observer.next(fn(v)),
        error: (e) => observer.error(e),
        complete: () => observer.complete(),
      });
      return () => sub.unsubscribe();
    });
  }

  /** Filter operator */
  filter(predicate: (value: T) => boolean): Observable<T> {
    return new Observable<T>((observer) => {
      const sub = this.subscribe({
        next: (v) => {
          if (predicate(v)) observer.next(v);
        },
        error: (e) => observer.error(e),
        complete: () => observer.complete(),
      });
      return () => sub.unsubscribe();
    });
  }

  /** Take first N values then complete */
  take(n: number): Observable<T> {
    return new Observable<T>((observer) => {
      let count = 0;
      const sub = this.subscribe({
        next: (v) => {
          observer.next(v);
          count++;
          if (count >= n) {
            observer.complete();
            sub.unsubscribe();
          }
        },
        error: (e) => observer.error(e),
        complete: () => observer.complete(),
      });
      return () => sub.unsubscribe();
    });
  }

  /** Convert to async iterable */
  [Symbol.asyncIterator](): AsyncIterator<T> {
    const queue: T[] = [];
    const waiters: Array<(value: IteratorResult<T>) => void> = [];
    let done = false;
    let error: unknown = null;

    const sub = this.subscribe({
      next: (v) => {
        const waiter = waiters.shift();
        if (waiter) {
          waiter({ value: v, done: false });
        } else {
          queue.push(v);
        }
      },
      error: (e) => {
        error = e;
        done = true;
        const waiter = waiters.shift();
        waiter?.({ value: undefined as unknown as T, done: true });
      },
      complete: () => {
        done = true;
        const waiter = waiters.shift();
        waiter?.({ value: undefined as unknown as T, done: true });
      },
    });

    return {
      next(): Promise<IteratorResult<T>> {
        if (queue.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          return Promise.resolve({ value: queue.shift()!, done: false });
        }
        if (done) {
          if (error) return Promise.reject(error as Error);
          return Promise.resolve({
            value: undefined as unknown as T,
            done: true,
          });
        }
        return new Promise((resolve) => waiters.push(resolve));
      },
      return(): Promise<IteratorResult<T>> {
        sub.unsubscribe();
        return Promise.resolve({ value: undefined as unknown as T, done: true });
      },
    };
  }

  /** Static: create from a promise */
  static from<T>(promise: Promise<T>): Observable<T> {
    return new Observable<T>((observer) => {
      promise.then(
        (v) => {
          observer.next(v);
          observer.complete();
        },
        (e: unknown) => observer.error(e),
      );
    });
  }

  /** Static: emit values and complete */
  static of<T>(...values: T[]): Observable<T> {
    return new Observable<T>((observer) => {
      for (const v of values) {
        observer.next(v);
        // SafeObserver.next() is a no-op when closed; no need to check here
      }
      observer.complete();
    });
  }

  /** Static: never emits */
  static never<T = never>(): Observable<T> {
    return new Observable<T>(() => {});
  }

  /** Static: immediately errors */
  static throw<T = never>(err: unknown): Observable<T> {
    return new Observable<T>((observer) => observer.error(err));
  }
}
