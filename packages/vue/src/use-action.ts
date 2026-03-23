/**
 * useAction — dispatch an ActionDefinition and reactively track status + result.
 */

import { shallowRef } from 'vue';
import type { ActionDefinition, ActionStatus, Session } from '@muix/core';

export interface UseActionResult<T> {
  dispatch: () => void;
  status: ReturnType<typeof shallowRef<ActionStatus>>;
  result: ReturnType<typeof shallowRef<T | undefined>>;
  error: ReturnType<typeof shallowRef<unknown | null>>;
  cancel: () => void;
}

export function useAction<T>(
  definition: ActionDefinition<T>,
  session: Session,
): UseActionResult<T> {
  const status = shallowRef<ActionStatus>('pending');
  const result = shallowRef<T | undefined>(undefined);
  const error = shallowRef<unknown | null>(null);

  let currentCancel: (() => void) | null = null;

  const dispatch = () => {
    currentCancel?.();

    const action = session.dispatch(definition);
    currentCancel = () => action.cancel();

    const subs = [
      action.status.observe().subscribe({ next: (v) => { status.value = v; } }),
      action.result.observe().subscribe({ next: (v) => { if (v !== undefined) result.value = v; } }),
      action.error.observe().subscribe({ next: (v) => { error.value = v; } }),
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
