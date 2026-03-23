/**
 * useSignal — bridges a MUIX ReadonlySignal into a Solid.js reactive accessor.
 *
 * Returns a Solid signal accessor [get, set] tuple backed by the MUIX signal.
 * The subscription is cleaned up automatically via onCleanup.
 */

import { createSignal as createSolidSignal, onCleanup } from 'solid-js';
import type { ReadonlySignal } from '@muix/core';

export function useSignal<T>(signal: ReadonlySignal<T>): () => T {
  const [get, set] = createSolidSignal<T>(signal.peek(), { equals: false });

  const sub = signal.observe().subscribe({
    next: (v) => set(() => v),
  });

  onCleanup(() => sub.unsubscribe());

  return get;
}
