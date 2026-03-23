/**
 * Solid.js session context — createContext/useContext pattern for Session.
 */

import { createContext, useContext, onMount, onCleanup } from 'solid-js';
import { createSession, type Session, type SessionOptions } from '@muix/core';

const SessionContext = createContext<Session | null>(null);

export { SessionContext };

export interface SessionProviderProps {
  children: unknown;
  session?: Session;
  options?: SessionOptions;
}

/**
 * Creates and provides a Session for the component tree.
 * Returns [session, Provider] so callers can use it imperatively or as JSX.
 */
export function createSessionProvider(opts: SessionProviderProps = { children: null }): {
  session: Session;
  Provider: typeof SessionContext.Provider;
} {
  const session = opts.session ?? createSession(opts.options);

  let started = false;

  onMount(async () => {
    await session.start();
    started = true;
  });

  onCleanup(() => {
    if (!opts.session && started) {
      session.terminate('SessionProvider unmounted').catch(() => {});
    }
  });

  return { session, Provider: SessionContext.Provider };
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error('useSession must be called inside a SessionContext.Provider');
  }
  return session;
}
