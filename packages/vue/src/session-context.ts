/**
 * Vue session context — provide/inject pattern for Session lifecycle.
 */

import {
  inject,
  provide,
  onMounted,
  onUnmounted,
  type InjectionKey,
} from 'vue';
import { createSession, type Session, type SessionOptions } from '@muix/core';

const SESSION_KEY: InjectionKey<Session> = Symbol('muix:session');

export interface UseSessionProviderOptions {
  /** Provide an already-created session instead of creating one */
  session?: Session;
  options?: SessionOptions;
}

/**
 * Call in a parent component's setup() to create and provide a Session.
 * The session is started on mount and terminated on unmount.
 */
export function provideSession(opts: UseSessionProviderOptions = {}): Session {
  const session = opts.session ?? createSession(opts.options);

  provide(SESSION_KEY, session);

  let started = false;

  onMounted(async () => {
    await session.start();
    started = true;
  });

  onUnmounted(() => {
    if (!opts.session && started) {
      session.terminate('Session provider unmounted').catch(() => {});
    }
  });

  return session;
}

/**
 * Call in a child component's setup() to get the nearest Session.
 * Throws if no session has been provided.
 */
export function useSession(): Session {
  const session = inject(SESSION_KEY);
  if (!session) {
    throw new Error('useSession must be called inside a component where provideSession() has been called.');
  }
  return session;
}
