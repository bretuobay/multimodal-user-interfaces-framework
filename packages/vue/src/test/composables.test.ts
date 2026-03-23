import { describe, it, expect } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { createSignal } from '@muix/core';
import { useSignal } from '../use-signal.js';

describe('useSignal', () => {
  it('returns current signal value', () => {
    const scope = effectScope();
    const sig = createSignal(42);
    let value: number | undefined;

    scope.run(() => {
      const ref = useSignal(sig);
      value = ref.value;
    });

    expect(value).toBe(42);
    scope.stop();
  });

  it('updates when signal changes', async () => {
    const scope = effectScope();
    const sig = createSignal(0);
    let ref: ReturnType<typeof useSignal<number>> | undefined;

    scope.run(() => {
      ref = useSignal(sig);
    });

    sig.set(99);
    await nextTick();

    expect(ref!.value).toBe(99);
    scope.stop();
  });

  it('unsubscribes on scope dispose', () => {
    const scope = effectScope();
    const sig = createSignal(0);
    let ref: ReturnType<typeof useSignal<number>> | undefined;

    scope.run(() => {
      ref = useSignal(sig);
    });

    scope.stop();

    // After scope disposal, changing the signal should NOT update the ref
    sig.set(100);
    expect(ref!.value).toBe(0);
  });
});
