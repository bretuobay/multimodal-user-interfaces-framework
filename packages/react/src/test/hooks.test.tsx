import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { createSignal, createSession } from '@muix/core';
import { SessionProvider, useSession } from '../session-context.js';
import { useSignal, useSessionStatus } from '../hooks.js';

// ---------------------------------------------------------------------------
// useSignal
// ---------------------------------------------------------------------------

function SignalDisplay({ signal }: { signal: ReturnType<typeof createSignal<number>> }) {
  const value = useSignal(signal);
  return <div data-testid="value">{value}</div>;
}

describe('useSignal', () => {
  it('renders the current signal value', () => {
    const sig = createSignal(42);
    render(<SignalDisplay signal={sig} />);
    expect(screen.getByTestId('value').textContent).toBe('42');
  });

  it('re-renders when signal changes', async () => {
    const sig = createSignal(0);
    render(<SignalDisplay signal={sig} />);
    expect(screen.getByTestId('value').textContent).toBe('0');

    act(() => sig.set(99));
    await waitFor(() =>
      expect(screen.getByTestId('value').textContent).toBe('99'),
    );
  });

  it('unsubscribes on unmount', () => {
    const sig = createSignal(1);
    const { unmount } = render(<SignalDisplay signal={sig} />);
    unmount();
    // Should not throw
    act(() => sig.set(2));
  });
});

// ---------------------------------------------------------------------------
// SessionProvider + useSession
// ---------------------------------------------------------------------------

function SessionDisplay() {
  const session = useSession();
  const status = useSessionStatus(session);
  return <div data-testid="status">{status}</div>;
}

describe('SessionProvider + useSession', () => {
  it('provides a session and starts it', async () => {
    render(
      <SessionProvider>
        <SessionDisplay />
      </SessionProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('active'),
    );
  });

  it('throws when useSession is used outside provider', () => {
    // Suppress React error boundary noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<SessionDisplay />)).toThrow(
      'useSession must be used within a <SessionProvider>',
    );
    consoleSpy.mockRestore();
  });

  it('accepts an external session', async () => {
    const externalSession = createSession({ id: 'external' });
    render(
      <SessionProvider session={externalSession}>
        <SessionDisplay />
      </SessionProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('active'),
    );
  });
});
