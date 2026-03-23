/**
 * SessionInspector — subscribes to a Session's signals and produces
 * real-time SessionSnapshot objects.
 *
 * Framework-agnostic: call snapshot() to read current state, or subscribe
 * to onChange to be notified on each update interval.
 */

import type { Session } from '@muix/core';
import { ChannelTracer } from './channel-tracer.js';
import type { SessionSnapshot, DevtoolsOptions } from './types.js';

type ChangeHandler = (snapshot: SessionSnapshot) => void;

export class SessionInspector {
  private readonly _session: Session;
  private readonly _tracers = new Map<string, ChannelTracer>();
  private readonly _handlers = new Set<ChangeHandler>();
  private _timerId: ReturnType<typeof setInterval> | null = null;
  private readonly _intervalMs: number;
  private _disposed = false;

  constructor(session: Session, options: DevtoolsOptions = {}) {
    this._session = session;
    this._intervalMs = options.updateIntervalMs ?? 500;

    for (const channelId of session.channelIds) {
      const channel = session.getChannel(channelId);
      if (channel) {
        this._tracers.set(channelId, new ChannelTracer(channel));
      }
    }

    // Track channel additions via session events
    session.on('channel:added', (e) => {
      const channel = e.channel ?? session.getChannel(e.channelId);
      if (channel && !this._tracers.has(channel.id)) {
        this._tracers.set(channel.id, new ChannelTracer(channel));
      }
    });
    session.on('channel:removed', (e) => {
      const tracer = this._tracers.get(e.channelId);
      tracer?.dispose();
      this._tracers.delete(e.channelId);
    });
  }

  /** Start polling and notifying change handlers */
  start(): void {
    if (this._timerId !== null || this._disposed) return;
    this._timerId = setInterval(() => {
      const snap = this.snapshot();
      for (const handler of this._handlers) {
        handler(snap);
      }
    }, this._intervalMs);
  }

  stop(): void {
    if (this._timerId !== null) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
  }

  /** Subscribe to snapshot updates */
  onChange(handler: ChangeHandler): () => void {
    this._handlers.add(handler);
    return () => this._handlers.delete(handler);
  }

  /** Read current state synchronously */
  snapshot(): SessionSnapshot {
    const channelSnapshots = Array.from(this._tracers.values()).map((tracer) =>
      tracer.snapshot,
    );

    return {
      id: this._session.id,
      status: this._session.status.peek(),
      channels: channelSnapshots,
      actions: [],
      capturedAt: Date.now(),
    };
  }

  dispose(): void {
    this.stop();
    for (const tracer of this._tracers.values()) tracer.dispose();
    this._tracers.clear();
    this._handlers.clear();
    this._disposed = true;
  }
}
