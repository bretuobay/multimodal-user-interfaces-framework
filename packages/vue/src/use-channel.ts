/**
 * useChannel — create and manage a Channel within a Vue component's lifecycle.
 */

import { shallowRef, onScopeDispose } from 'vue';
import type { Channel, ChannelStatus, Session } from '@muix/core';

export interface UseChannelResult<In, Out> {
  channel: Channel<In, Out>;
  status: ReturnType<typeof shallowRef<ChannelStatus>>;
  error: ReturnType<typeof shallowRef<unknown | null>>;
}

export function useChannel<In, Out = In>(
  factory: (session: Session) => Channel<In, Out>,
  session: Session,
): UseChannelResult<In, Out> {
  const channel = factory(session);
  const status = shallowRef<ChannelStatus>(channel.status.peek());
  const error = shallowRef<unknown | null>(channel.error.peek());

  const statusSub = channel.status.observe().subscribe({ next: (v) => { status.value = v; } });
  const errorSub = channel.error.observe().subscribe({ next: (v) => { error.value = v; } });

  onScopeDispose(() => {
    statusSub.unsubscribe();
    errorSub.unsubscribe();
    channel.close().catch(() => {});
  });

  return { channel, status, error };
}
