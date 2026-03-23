/**
 * Core React hooks for MUIX primitives.
 */

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import type {
  ReadonlySignal,
  Channel,
  ChannelStatus,
  Session,
  ActionDefinition,
  ActionStatus,
} from '@muix/core';

// ---------------------------------------------------------------------------
// useSignal — subscribe to a Signal and re-render on change
// ---------------------------------------------------------------------------

export function useSignal<T>(signal: ReadonlySignal<T>): T {
  const [, forceRender] = useReducer((n: number) => n + 1, 0);
  // Track the current value in a ref so we return it synchronously
  const valueRef = useRef<T>(signal.peek());

  useEffect(() => {
    const sub = signal.observe().subscribe({
      next: (v) => {
        valueRef.current = v;
        forceRender();
      },
    });
    return () => sub.unsubscribe();
  }, [signal]);

  return valueRef.current;
}

// ---------------------------------------------------------------------------
// useChannel — create/manage a Channel, expose status and error
// ---------------------------------------------------------------------------

export interface UseChannelResult<In, Out> {
  channel: Channel<In, Out>;
  status: ChannelStatus;
  error: unknown | null;
}

export function useChannel<In, Out = In>(
  factory: (session: Session) => Channel<In, Out>,
  session: Session,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: unknown[] = [],
): UseChannelResult<In, Out> {
  const channelRef = useRef<Channel<In, Out> | null>(null);
  const [status, setStatus] = useState<ChannelStatus>('idle');
  const [error, setError] = useState<unknown | null>(null);

  if (!channelRef.current) {
    channelRef.current = factory(session);
  }

  const channel = channelRef.current;

  useEffect(() => {
    const sub = channel.status.observe().subscribe({
      next: setStatus,
    });
    const errSub = channel.error.observe().subscribe({
      next: setError,
    });
    return () => {
      sub.unsubscribe();
      errSub.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, ...deps]);

  return { channel, status, error };
}

// ---------------------------------------------------------------------------
// useAction — dispatch an ActionDefinition, track status and result
// ---------------------------------------------------------------------------

export interface UseActionResult<T> {
  dispatch: () => void;
  status: ActionStatus;
  result: T | undefined;
  error: unknown | null;
  cancel: () => void;
}

export function useAction<T>(
  definition: ActionDefinition<T>,
  session: Session,
): UseActionResult<T> {
  const [status, setStatus] = useState<ActionStatus>('pending');
  const [result, setResult] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown | null>(null);
  // Store refs to subscriptions/action for cleanup
  const actionRef = useRef<{ cancel: () => void } | null>(null);

  const dispatch = useCallback(() => {
    // Cancel previous action if still running
    actionRef.current?.cancel();

    const action = session.dispatch(definition);
    actionRef.current = action;

    const statusSub = action.status.observe().subscribe({
      next: setStatus,
    });
    const resultSub = action.result.observe().subscribe({
      next: (v) => {
        if (v !== undefined) setResult(v);
      },
    });
    const errorSub = action.error.observe().subscribe({
      next: setError,
    });

    // Cleanup subscriptions when action finishes
    action.status.observe().subscribe({
      next: (s) => {
        if (s === 'completed' || s === 'failed' || s === 'cancelled') {
          statusSub.unsubscribe();
          resultSub.unsubscribe();
          errorSub.unsubscribe();
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, definition]);

  const cancel = useCallback(() => {
    actionRef.current?.cancel();
  }, []);

  return { dispatch, status, result, error, cancel };
}

// ---------------------------------------------------------------------------
// useSessionStatus — reactive session status
// ---------------------------------------------------------------------------

export function useSessionStatus(session: Session): ReturnType<typeof useSignal> {
  return useSignal(session.status);
}
