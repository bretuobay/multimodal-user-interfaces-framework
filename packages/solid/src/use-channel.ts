/**
 * useChannel — creates and manages a Channel within a Solid component.
 */

import { createSignal as createSolidSignal, onCleanup } from 'solid-js';
import type { Channel, ChannelStatus, Session } from '@muix/core';

export interface UseChannelResult<In, Out> {
  channel: Channel<In, Out>;
  status: () => ChannelStatus;
  error: () => unknown | null;
}

export function useChannel<In, Out = In>(
  factory: (session: Session) => Channel<In, Out>,
  session: Session,
): UseChannelResult<In, Out> {
  const channel = factory(session);

  const [status, setStatus] = createSolidSignal<ChannelStatus>(channel.status.peek());
  const [error, setError] = createSolidSignal<unknown | null>(channel.error.peek());

  const statusSub = channel.status.observe().subscribe({ next: setStatus });
  const errorSub = channel.error.observe().subscribe({ next: setError });

  onCleanup(() => {
    statusSub.unsubscribe();
    errorSub.unsubscribe();
    channel.close().catch(() => {});
  });

  return { channel, status, error };
}
