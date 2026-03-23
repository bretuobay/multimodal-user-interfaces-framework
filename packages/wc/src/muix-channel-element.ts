/**
 * <muix-channel> — Custom element that creates a Channel within the nearest
 * <muix-session> ancestor and exposes it on the element instance.
 *
 * Attributes:
 *   type  — "text" | "audio" | "video" | "motion"  (default: "generic")
 *   channel-id — optional id forwarded to Channel constructor
 *
 * Usage:
 *   <muix-session>
 *     <muix-channel type="text" channel-id="main-text"></muix-channel>
 *   </muix-session>
 *
 * The element listens for `muix:session` on its parent to receive the Session
 * and then calls session.addChannel(). The resulting Channel is exposed as
 * `element.channel`.
 */

import { type Channel, type Session } from '@muix/core';

export type MuixChannelType = 'text' | 'audio' | 'video' | 'motion' | 'generic';

export class MuixChannelElement extends HTMLElement {
  private _channel: Channel<unknown, unknown> | null = null;
  private _session: Session | null = null;

  connectedCallback(): void {
    const parent = this.parentElement;
    if (!parent) return;

    // Try to get session from parent <muix-session> element synchronously
    const sessionEl = this.closest('muix-session');
    if (sessionEl && 'session' in sessionEl) {
      this._attachToSession((sessionEl as { session: Session | null }).session);
      return;
    }

    // Otherwise wait for the muix:session event bubbling from parent
    const handler = (e: Event): void => {
      const { session } = (e as CustomEvent<{ session: Session }>).detail;
      this._attachToSession(session);
      parent.removeEventListener('muix:session', handler);
    };
    parent.addEventListener('muix:session', handler);
  }

  disconnectedCallback(): void {
    this._channel?.close().catch(() => {});
    this._channel = null;
    this._session = null;
  }

  private _attachToSession(session: Session | null): void {
    if (!session) return;
    this._session = session;

    const channelId =
      this.getAttribute('channel-id') ??
      `${this.getAttribute('type') ?? 'generic'}-${Math.random().toString(36).slice(2)}`;

    this._channel = session.addChannel(channelId);

    this.dispatchEvent(
      new CustomEvent('muix:channel', {
        detail: { channel: this._channel },
        bubbles: true,
        composed: true,
      }),
    );
  }

  get channel(): Channel<unknown, unknown> | null {
    return this._channel;
  }

  get channelType(): MuixChannelType {
    return (this.getAttribute('type') as MuixChannelType) ?? 'generic';
  }

  static get observedAttributes(): string[] {
    return ['type', 'channel-id'];
  }
}

customElements.define('muix-channel', MuixChannelElement);
