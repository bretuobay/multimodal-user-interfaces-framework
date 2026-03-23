/**
 * useSignal — reactive wrapper for a ReadonlySignal that integrates with
 * Vue's reactivity system via a shallowRef.
 */

import { shallowRef, onScopeDispose } from 'vue';
import type { ReadonlySignal } from '@muix/core';

export function useSignal<T>(signal: ReadonlySignal<T>) {
  const value = shallowRef<T>(signal.peek());

  const sub = signal.observe().subscribe({
    next: (v) => { value.value = v; },
  });

  onScopeDispose(() => sub.unsubscribe());

  return value;
}
