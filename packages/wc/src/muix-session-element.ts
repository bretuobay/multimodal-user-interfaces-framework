/**
 * <muix-session> — Custom element that creates and manages a MUIX Session.
 *
 * Dispatches a `muix:session` CustomEvent on connectedCallback so child
 * elements can retrieve the session instance.
 *
 * Usage:
 *   <muix-session id="chat-session">
 *     <muix-channel type="text"></muix-channel>
 *   </muix-session>
 */

import { createSession, type Session } from '@muix/core';

export class MuixSessionElement extends HTMLElement {
  private _session: Session | null = null;

  connectedCallback(): void {
    this._session = createSession({ id: this.getAttribute('session-id') ?? undefined });

    this._session.start().catch((e) => {
      console.error('[muix-session] Failed to start session:', e);
    });

    // Notify children
    this.dispatchEvent(
      new CustomEvent<{ session: Session }>('muix:session', {
        detail: { session: this._session },
        bubbles: false,
        composed: false,
      }),
    );
  }

  disconnectedCallback(): void {
    this._session?.terminate('muix-session disconnected').catch(() => {});
    this._session = null;
  }

  get session(): Session | null {
    return this._session;
  }
}

customElements.define('muix-session', MuixSessionElement);
