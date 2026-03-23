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

type Listener<T> = (value: T) => void;

export class Signal<T> implements ReadonlySignal<T> {
  private _value: T;
  private readonly _equals: (a: T, b: T) => boolean;
  private readonly _listeners = new Set<Listener<T>>();

  constructor(initialValue: T, options: SignalOptions<T> = {}) {
    this._value = initialValue;
    this._equals = options.equals ?? Object.is;
  }

  get value(): T {
    return this._value;
  }

  peek(): T {
    return this._value;
  }

  set(value: T): void {
    if (this._equals(this._value, value)) return;
    this._value = value;
    this._notify(value);
  }

  update(fn: (current: T) => T): void {
    this.set(fn(this._value));
  }

  observe(): Observable<T> {
    return new Observable<T>((observer) => {
      // Emit current value immediately
      observer.next(this._value);

      const listener: Listener<T> = (v) => observer.next(v);
      this._listeners.add(listener);

      return () => {
        this._listeners.delete(listener);
      };
    });
  }

  private _notify(value: T): void {
    for (const listener of this._listeners) {
      try {
        listener(value);
      } catch {
        // swallow listener errors
      }
    }
  }
}

/**
 * A derived (computed) signal whose value is derived from other signals.
 * Re-evaluates lazily when read after any dependency changes.
 */
export class ComputedSignal<T> implements ReadonlySignal<T> {
  private _value: T;
  private _dirty = true;
  private readonly _equals: (a: T, b: T) => boolean;
  private readonly _listeners = new Set<Listener<T>>();
  private readonly _subscriptions: Array<{ unsubscribe: () => void }>;

  constructor(
    private readonly _compute: () => T,
    deps: Array<ReadonlySignal<unknown>>,
    options: SignalOptions<T> = {},
  ) {
    this._equals = options.equals ?? Object.is;
    this._value = this._compute();
    this._dirty = false;

    // Subscribe to all deps to invalidate on future changes.
    // Skip the initial synchronous emission (current value) since we already computed it.
    this._subscriptions = deps.map((dep) => {
      let isFirst = true;
      return dep.observe().subscribe({
        next: () => {
          if (isFirst) { isFirst = false; return; }
          this._invalidate();
        },
      });
    });
  }

  get value(): T {
    if (this._dirty) this._recompute();
    return this._value;
  }

  peek(): T {
    return this._value;
  }

  observe(): Observable<T> {
    return new Observable<T>((observer) => {
      observer.next(this.value);
      const listener: Listener<T> = (v) => observer.next(v);
      this._listeners.add(listener);
      return () => this._listeners.delete(listener);
    });
  }

  dispose(): void {
    for (const sub of this._subscriptions) sub.unsubscribe();
    this._listeners.clear();
  }

  private _invalidate(): void {
    this._dirty = true;
    this._recompute();
  }

  private _recompute(): void {
    const next = this._compute();
    this._dirty = false;
    if (this._equals(this._value, next)) return;
    this._value = next;
    for (const listener of this._listeners) {
      try {
        listener(next);
      } catch {
        // swallow
      }
    }
  }
}

/** Factory helpers */
export function createSignal<T>(
  initialValue: T,
  options?: SignalOptions<T>,
): Signal<T> {
  return new Signal<T>(initialValue, options);
}

export function createComputed<T>(
  compute: () => T,
  deps: Array<ReadonlySignal<unknown>>,
  options?: SignalOptions<T>,
): ComputedSignal<T> {
  return new ComputedSignal<T>(compute, deps, options);
}
