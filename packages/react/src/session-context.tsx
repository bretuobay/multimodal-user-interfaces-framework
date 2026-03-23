/**
 * SessionProvider and useSession — React context for Session lifecycle.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { createSession, type Session, type SessionOptions } from '@muix/core';

interface SessionContextValue {
  session: Session;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export interface SessionProviderProps {
  children: ReactNode;
  /** Provide an existing session, or let the provider create and manage one */
  session?: Session;
  options?: SessionOptions;
}

export function SessionProvider({
  children,
  session: externalSession,
  options,
}: SessionProviderProps): React.ReactElement {
  const sessionRef = useRef<Session | null>(null);

  if (!sessionRef.current) {
    sessionRef.current = externalSession ?? createSession(options);
  }

  const session = sessionRef.current;

  useEffect(() => {
    let started = false;
    session.start().then(() => { started = true; }).catch(() => {});

    return () => {
      // Only terminate sessions we created (not external ones)
      if (!externalSession && started) {
        session.terminate('SessionProvider unmounted').catch(() => {});
      }
    };
  }, [session, externalSession]);

  const value = useMemo(() => ({ session }), [session]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a <SessionProvider>');
  }
  return ctx.session;
}
