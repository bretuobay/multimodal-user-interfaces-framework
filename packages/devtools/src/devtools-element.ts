/**
 * <muix-devtools> — floating inspector panel custom element.
 *
 * Usage:
 *   import '@muix/devtools';  // registers the element
 *   const el = document.createElement('muix-devtools');
 *   el.attach(session);
 *   document.body.appendChild(el);
 *
 *   // Or declaratively if session is in scope:
 *   <muix-devtools></muix-devtools>
 *   document.querySelector('muix-devtools').attach(mySession);
 */

import type { Session } from '@muix/core';
import { SessionInspector } from './session-inspector.js';
import type { DevtoolsOptions, SessionSnapshot } from './types.js';

const BaseHTMLElement: typeof HTMLElement =
  typeof HTMLElement === 'undefined'
    ? class {} as typeof HTMLElement
    : HTMLElement;

const PANEL_STYLES = `
  :host {
    all: initial;
    font-family: monospace;
    font-size: 12px;
    position: fixed;
    z-index: 9999;
    bottom: 16px;
    right: 16px;
  }
  .panel {
    background: rgba(15, 15, 20, 0.92);
    color: #e0e0e0;
    border: 1px solid #333;
    border-radius: 6px;
    min-width: 280px;
    max-width: 360px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    overflow: hidden;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: rgba(30, 30, 40, 0.95);
    cursor: pointer;
    user-select: none;
    border-bottom: 1px solid #333;
  }
  .header .title { color: #7c9ef8; font-weight: bold; letter-spacing: 0.04em; }
  .header .toggle { color: #888; }
  .body { padding: 8px 10px; }
  .section { margin-bottom: 8px; }
  .section-label { color: #888; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
  .row { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #1e1e28; }
  .key { color: #aaa; }
  .val { color: #7cf8c0; }
  .val.error { color: #f87c7c; }
  .val.warn  { color: #f8d07c; }
  .collapsed .body { display: none; }
`;

function statusColor(status: string): string {
  if (status === 'active' || status === 'open') return '#7cf8c0';
  if (status === 'terminated' || status === 'errored') return '#f87c7c';
  return '#f8d07c';
}

function renderSnapshot(snap: SessionSnapshot): string {
  const sessionStatus = `<span style="color:${statusColor(snap.status)}">${snap.status}</span>`;

  const channels = snap.channels.length === 0
    ? '<div class="row"><span class="key">—</span></div>'
    : snap.channels.map((ch) => `
        <div class="row">
          <span class="key">${ch.id.slice(0, 20)}</span>
          <span class="val">${ch.fps} fps · ${ch.frameCount} frames</span>
        </div>`).join('');

  const elapsed = Date.now() - snap.capturedAt;

  return `
    <div class="section">
      <div class="section-label">Session</div>
      <div class="row"><span class="key">id</span><span class="val">${snap.id}</span></div>
      <div class="row"><span class="key">status</span><span class="val">${sessionStatus}</span></div>
      <div class="row"><span class="key">updated</span><span class="key">${elapsed}ms ago</span></div>
    </div>
    <div class="section">
      <div class="section-label">Channels (${snap.channels.length})</div>
      ${channels}
    </div>
  `;
}

export class MuixDevtoolsElement extends BaseHTMLElement {
  private _inspector: SessionInspector | null = null;
  private _unsubscribe: (() => void) | null = null;
  private _collapsed = false;
  private _shadow: ShadowRoot;
  private _panel: HTMLDivElement | null = null;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    const style = document.createElement('style');
    style.textContent = PANEL_STYLES;
    this._shadow.appendChild(style);

    this._panel = document.createElement('div');
    this._panel.className = 'panel';
    this._panel.innerHTML = `
      <div class="header">
        <span class="title">⬡ MUIX DevTools</span>
        <span class="toggle">▼</span>
      </div>
      <div class="body"><em style="color:#666">No session attached</em></div>
    `;
    this._panel.querySelector('.header')?.addEventListener('click', () => this._toggleCollapse());
    this._shadow.appendChild(this._panel);
  }

  disconnectedCallback(): void {
    this.detach();
  }

  attach(session: Session, options?: DevtoolsOptions): void {
    this.detach();

    this._inspector = new SessionInspector(session, options);
    this._inspector.start();

    this._unsubscribe = this._inspector.onChange((snap) => this._render(snap));

    // Render immediately
    this._render(this._inspector.snapshot());
  }

  detach(): void {
    this._unsubscribe?.();
    this._inspector?.dispose();
    this._unsubscribe = null;
    this._inspector = null;
  }

  private _toggleCollapse(): void {
    this._collapsed = !this._collapsed;
    if (this._panel) {
      this._panel.className = this._collapsed ? 'panel collapsed' : 'panel';
      const toggle = this._panel.querySelector('.toggle');
      if (toggle) toggle.textContent = this._collapsed ? '▶' : '▼';
    }
  }

  private _render(snap: SessionSnapshot): void {
    const body = this._panel?.querySelector('.body');
    if (body) body.innerHTML = renderSnapshot(snap);
  }
}

if (
  typeof customElements !== 'undefined' &&
  !customElements.get('muix-devtools')
) {
  customElements.define('muix-devtools', MuixDevtoolsElement);
}
