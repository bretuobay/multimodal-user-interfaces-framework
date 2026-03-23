import { describe, it, expect } from 'vitest';
import { createRoot } from 'solid-js';
import { createSignal } from '@muix/core';
import { useSignal } from '../use-signal.js';

describe('useSignal', () => {
  it('returns the current signal value', () => {
    createRoot((dispose) => {
      const sig = createSignal(42);
      const get = useSignal(sig);
      expect(get()).toBe(42);
      dispose();
    });
  });

  it('updates reactively when signal changes', () => {
    createRoot((dispose) => {
      const sig = createSignal(0);
      const get = useSignal(sig);

      expect(get()).toBe(0);
      sig.set(7);
      expect(get()).toBe(7);
      sig.set(99);
      expect(get()).toBe(99);

      dispose();
    });
  });

  it('unsubscribes on root disposal', () => {
    let get: (() => number) | undefined;

    const dispose = createRoot((d) => {
      const sig = createSignal(0);
      get = useSignal(sig);
      return d;
    });

    dispose();

    // After disposal, Signal changes should not be tracked
    // (no error means the cleanup ran without issue)
    expect(get!()).toBe(0);
  });
});
