/**
 * useAction — dispatch an ActionDefinition and reactively track its lifecycle.
 */

import { createSignal as createSolidSignal } from 'solid-js';
import type { ActionDefinition, ActionStatus, Session } from '@muix/core';

export interface UseActionResult<T> {
  dispatch: () => void;
  status: () => ActionStatus;
  result: () => T | undefined;
  error: () => unknown | null;
  cancel: () => void;
}

export function useAction<T>(
  definition: ActionDefinition<T>,
  session: Session,
): UseActionResult<T> {
  const [status, setStatus] = createSolidSignal<ActionStatus>('pending');
  const [result, setResult] = createSolidSignal<T | undefined>(undefined);
  const [error, setError] = createSolidSignal<unknown | null>(null);

  let currentCancel: (() => void) | null = null;

  const dispatch = () => {
    currentCancel?.();

    const action = session.dispatch(definition);
    currentCancel = () => action.cancel();

    const subs = [
      action.status.observe().subscribe({ next: setStatus }),
      action.result.observe().subscribe({ next: (v) => { if (v !== undefined) setResult(() => v); } }),
      action.error.observe().subscribe({ next: setError }),
    ];

    action.status.observe().subscribe({
      next: (s) => {
        if (s === 'completed' || s === 'failed' || s === 'cancelled') {
          subs.forEach((sub) => sub.unsubscribe());
        }
      },
    });
  };

  const cancel = () => currentCancel?.();

  return { dispatch, status, result, error, cancel };
}
