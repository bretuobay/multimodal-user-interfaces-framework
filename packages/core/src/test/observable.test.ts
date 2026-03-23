import { describe, it, expect, vi } from 'vitest';
import { Observable } from '../observable.js';

describe('Observable', () => {
  it('emits values to subscriber', () => {
    const values: number[] = [];
    const obs = new Observable<number>((observer) => {
      observer.next(1);
      observer.next(2);
      observer.next(3);
      observer.complete();
    });

    obs.subscribe({ next: (v) => values.push(v) });
    expect(values).toEqual([1, 2, 3]);
  });

  it('completes and stops emitting', () => {
    const values: number[] = [];
    const obs = new Observable<number>((observer) => {
      observer.next(1);
      observer.complete();
      observer.next(2); // should not be received
    });

    obs.subscribe({ next: (v) => values.push(v) });
    expect(values).toEqual([1]);
  });

  it('calls cleanup on unsubscribe', () => {
    const cleanup = vi.fn();
    const obs = new Observable<number>(() => cleanup);
    const sub = obs.subscribe({});
    sub.unsubscribe();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(sub.closed).toBe(true);
  });

  it('does not call cleanup twice', () => {
    const cleanup = vi.fn();
    const obs = new Observable<number>(() => cleanup);
    const sub = obs.subscribe({});
    sub.unsubscribe();
    sub.unsubscribe();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('forwards errors to observer', () => {
    const err = new Error('oops');
    let received: unknown;
    const obs = new Observable<number>((observer) => {
      observer.error(err);
    });
    obs.subscribe({ error: (e) => (received = e) });
    expect(received).toBe(err);
  });

  it('calls cleanup on error', () => {
    const cleanup = vi.fn();
    const obs = new Observable<number>((observer) => {
      observer.error(new Error('boom'));
      return cleanup;
    });
    obs.subscribe({ error: () => {} });
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('map transforms values', () => {
    const values: string[] = [];
    Observable.of(1, 2, 3)
      .map((v) => v.toString())
      .subscribe({ next: (v) => values.push(v) });
    expect(values).toEqual(['1', '2', '3']);
  });

  it('filter removes non-matching values', () => {
    const values: number[] = [];
    Observable.of(1, 2, 3, 4, 5)
      .filter((v) => v % 2 === 0)
      .subscribe({ next: (v) => values.push(v) });
    expect(values).toEqual([2, 4]);
  });

  it('take limits emission count', () => {
    const values: number[] = [];
    Observable.of(1, 2, 3, 4, 5)
      .take(3)
      .subscribe({ next: (v) => values.push(v) });
    expect(values).toEqual([1, 2, 3]);
  });

  it('Observable.of emits all values synchronously', () => {
    const values: number[] = [];
    Observable.of(10, 20, 30).subscribe({ next: (v) => values.push(v) });
    expect(values).toEqual([10, 20, 30]);
  });

  it('Observable.from resolves a promise', async () => {
    const values: string[] = [];
    await new Promise<void>((resolve) => {
      Observable.from(Promise.resolve('hello')).subscribe({
        next: (v) => values.push(v),
        complete: resolve,
      });
    });
    expect(values).toEqual(['hello']);
  });

  it('[Symbol.observable] returns self for RxJS interop', () => {
    const obs = Observable.of(1);
    expect(obs[Symbol.observable]()).toBe(obs);
  });

  it('async iterator yields values', async () => {
    const obs = Observable.of(1, 2, 3);
    const collected: number[] = [];
    for await (const v of obs) {
      collected.push(v);
    }
    expect(collected).toEqual([1, 2, 3]);
  });
});
