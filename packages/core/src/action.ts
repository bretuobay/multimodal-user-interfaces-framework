/**
 * Action — a cancellable async unit of work with streaming progress.
 * Uses AbortSignal for cancellation; emits progress via Observable.
 */

import { Observable } from './observable.js';
import { Signal, type ReadonlySignal } from './signal.js';

export type ActionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface ActionProgress<T = unknown> {
  readonly percent?: number;
  readonly partial?: T;
  readonly message?: string;
}

export interface ActionDefinition<T, P = ActionProgress<T>> {
  readonly type: string;
  execute(
    signal: AbortSignal,
    emit: (progress: P) => void,
  ): Promise<T> | AsyncGenerator<P, T>;
}

async function resolveExecutionResult<T>(
  resultOrGen: Promise<T> | AsyncGenerator<ActionProgress<T>, T>,
  signal: AbortSignal,
  emit: (progress: ActionProgress<T>) => void,
): Promise<T> {
  if (
    resultOrGen !== null &&
    typeof resultOrGen === 'object' &&
    Symbol.asyncIterator in resultOrGen
  ) {
    const iterator = resultOrGen as AsyncGenerator<ActionProgress<T>, T>;
    try {
      while (true) {
        const step = await iterator.next();
        if (step.done) {
          return step.value;
        }
        if (signal.aborted) {
          break;
        }
        emit(step.value);
      }
    } finally {
      if (signal.aborted) {
        const returnResult = iterator.return?.(undefined as T);
        if (returnResult) {
          await returnResult.catch(() => undefined);
        }
      }
    }

    throw new Error('Action cancelled');
  }

  return await resultOrGen;
}

export class Action<T> {
  readonly id: string;
  readonly type: string;
  readonly signal: AbortSignal;

  private readonly _status: Signal<ActionStatus>;
  private readonly _result: Signal<T | undefined>;
  private readonly _error: Signal<unknown | null>;
  private readonly _abortController: AbortController;
  private readonly _progressListeners = new Set<
    (progress: ActionProgress<T>) => void
  >();

  constructor(id: string, type: string) {
    this.id = id;
    this.type = type;
    this._abortController = new AbortController();
    this.signal = this._abortController.signal;
    this._status = new Signal<ActionStatus>('pending');
    this._result = new Signal<T | undefined>(undefined);
    this._error = new Signal<unknown | null>(null);
  }

  get status(): ReadonlySignal<ActionStatus> {
    return this._status;
  }

  get result(): ReadonlySignal<T | undefined> {
    return this._result;
  }

  get error(): ReadonlySignal<unknown | null> {
    return this._error;
  }

  cancel(reason?: string): void {
    if (
      this._status.value === 'completed' ||
      this._status.value === 'cancelled' ||
      this._status.value === 'failed'
    ) {
      return;
    }
    this._abortController.abort(reason ?? 'Action cancelled');
    this._status.set('cancelled');
  }

  observe(): Observable<ActionProgress<T>> {
    return new Observable<ActionProgress<T>>((observer) => {
      const listener = (p: ActionProgress<T>): void => observer.next(p);
      this._progressListeners.add(listener);

      // Complete the observable when action finishes
      const statusSub = this._status.observe().subscribe({
        next: (status) => {
          if (
            status === 'completed' ||
            status === 'cancelled' ||
            status === 'failed'
          ) {
            observer.complete();
          }
        },
      });

      return () => {
        this._progressListeners.delete(listener);
        statusSub.unsubscribe();
      };
    });
  }

  /**
   * Returns a Promise that resolves with the action's result or rejects on failure/cancellation.
   * NOTE: This is NOT named `then` to avoid the JavaScript thenable trap — if an Action had
   * a `.then` method, `await action` would unwrap the result instead of the Action instance.
   */
  toPromise(): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this._status.value === 'completed' && this._result.value !== undefined) {
        resolve(this._result.value as T);
        return;
      }
      if (this._status.value === 'failed') {
        reject(this._error.value);
        return;
      }
      if (this._status.value === 'cancelled') {
        reject(new Error('Action cancelled'));
        return;
      }
      const sub = this._status.observe().subscribe({
        next: (status) => {
          if (status === 'completed') {
            sub.unsubscribe();
            resolve(this._result.value as T);
          } else if (status === 'failed' || status === 'cancelled') {
            sub.unsubscribe();
            reject(this._error.value ?? new Error(`Action ${status}`));
          }
        },
      });
    });
  }

  /** Internal: called by ActionRunner to update state */
  _setRunning(): void {
    this._status.set('running');
  }

  _emitProgress(progress: ActionProgress<T>): void {
    for (const listener of this._progressListeners) {
      try {
        listener(progress);
      } catch {
        // swallow
      }
    }
  }

  _setCompleted(result: T): void {
    this._result.set(result);
    this._status.set('completed');
    this._progressListeners.clear();
  }

  _setFailed(error: unknown): void {
    this._error.set(error);
    this._status.set('failed');
    this._progressListeners.clear();
  }
}

let _actionCounter = 0;

/** Execute an ActionDefinition and return the Action handle */
export async function runAction<T>(
  definition: ActionDefinition<T>,
  signal?: AbortSignal,
): Promise<Action<T>> {
  const id = `action-${++_actionCounter}`;
  const action = new Action<T>(id, definition.type);

  // If an external AbortSignal is provided, link it
  if (signal) {
    signal.addEventListener('abort', () => action.cancel('External abort'));
  }

  action._setRunning();

  (async () => {
    try {
      const result = await resolveExecutionResult(
        definition.execute(action.signal, (p) =>
          action._emitProgress(p as ActionProgress<T>),
        ) as Promise<T> | AsyncGenerator<ActionProgress<T>, T>,
        action.signal,
        (progress) => action._emitProgress(progress),
      );
      if (!action.signal.aborted) {
        action._setCompleted(result);
      }
    } catch (e: unknown) {
      if (action.signal.aborted) {
        // Already marked cancelled
      } else {
        action._setFailed(e);
      }
    }
  })();

  return action;
}

/** Create an action without running it */
export function createAction<T>(type: string): Action<T> {
  const id = `action-${++_actionCounter}`;
  return new Action<T>(id, type);
}
