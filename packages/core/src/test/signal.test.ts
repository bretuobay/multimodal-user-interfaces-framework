import { describe, it, expect, vi } from 'vitest';
import { Signal, ComputedSignal, createSignal, createComputed } from '../signal.js';

describe('Signal', () => {
  it('holds initial value', () => {
    const s = new Signal(42);
    expect(s.value).toBe(42);
    expect(s.peek()).toBe(42);
  });

  it('updates value with set()', () => {
    const s = createSignal(1);
    s.set(2);
    expect(s.value).toBe(2);
  });

  it('updates value with update()', () => {
    const s = createSignal(10);
    s.update((v) => v * 2);
    expect(s.value).toBe(20);
  });

  it('does not notify when value is equal (Object.is)', () => {
    const s = createSignal(5);
    const listener = vi.fn();
    s.observe().subscribe({ next: listener });
    // First emission is the initial value
    expect(listener).toHaveBeenCalledOnce();
    s.set(5); // same value — no notification
    expect(listener).toHaveBeenCalledOnce();
  });

  it('notifies on value change', () => {
    const s = createSignal('a');
    const values: string[] = [];
    s.observe().subscribe({ next: (v) => values.push(v) });
    s.set('b');
    s.set('c');
    expect(values).toEqual(['a', 'b', 'c']);
  });

  it('emits current value immediately on subscribe', () => {
    const s = createSignal('initial');
    let received: string | undefined;
    s.observe().subscribe({ next: (v) => (received = v) });
    expect(received).toBe('initial');
  });

  it('unsubscribe stops notifications', () => {
    const s = createSignal(0);
    const calls: number[] = [];
    const sub = s.observe().subscribe({ next: (v) => calls.push(v) });
    expect(calls).toEqual([0]); // initial
    s.set(1);
    expect(calls).toEqual([0, 1]);
    sub.unsubscribe();
    s.set(2);
    expect(calls).toEqual([0, 1]); // no more updates
  });

  it('supports custom equality function', () => {
    const s = new Signal({ x: 1 }, { equals: (a, b) => a.x === b.x });
    const listener = vi.fn();
    s.observe().subscribe({ next: listener });
    s.set({ x: 1 }); // same x — no notification
    expect(listener).toHaveBeenCalledOnce();
    s.set({ x: 2 }); // different x — notification
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('ComputedSignal', () => {
  it('derives value from dependencies', () => {
    const a = createSignal(2);
    const b = createSignal(3);
    const sum = createComputed(() => a.value + b.value, [a, b]);
    expect(sum.value).toBe(5);
  });

  it('recomputes when dependency changes', () => {
    const x = createSignal(10);
    const doubled = createComputed(() => x.value * 2, [x]);
    expect(doubled.value).toBe(20);
    x.set(5);
    expect(doubled.value).toBe(10);
  });

  it('emits new value when dep changes', () => {
    const base = createSignal(1);
    const computed = createComputed(() => base.value + 100, [base]);
    const values: number[] = [];
    computed.observe().subscribe({ next: (v) => values.push(v) });
    base.set(2);
    base.set(3);
    expect(values).toEqual([101, 102, 103]);
  });

  it('does not recompute if result is equal', () => {
    const toggle = createSignal(true);
    const compute = vi.fn(() => 'always-same');
    const c = new ComputedSignal(compute, [toggle]);
    toggle.set(false);
    // compute called once during construction and once on dep change
    expect(compute).toHaveBeenCalledTimes(2);
    expect(c.value).toBe('always-same');
  });

  it('disposes subscriptions on dispose()', () => {
    const dep = createSignal(0);
    const c = createComputed(() => dep.value, [dep]);
    const vals: number[] = [];
    c.observe().subscribe({ next: (v) => vals.push(v) });
    dep.set(1);
    expect(vals).toContain(1);
    c.dispose();
    dep.set(2);
    // After dispose, no more updates
    expect(vals).not.toContain(2);
  });
});
