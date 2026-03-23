/**
 * ChannelTracer — attaches to a Channel's observable and tracks frame metrics
 * (count, fps, last frame timestamp) without holding a reader lock.
 */

import type { Channel, ChannelFrame } from '@muix/core';
import type { ChannelSnapshot } from './types.js';

export class ChannelTracer {
  readonly channelId: string;
  private _frameCount = 0;
  private _lastFrameAt: number | null = null;
  private _recentTimestamps: number[] = [];
  private _sub: { unsubscribe(): void } | null = null;

  constructor(channel: Channel<unknown, unknown>) {
    this.channelId = channel.id;

    this._sub = channel.observe().subscribe({
      next: (_frame: ChannelFrame<unknown>) => {
        const now = Date.now();
        this._frameCount++;
        this._lastFrameAt = now;
        this._recentTimestamps.push(now);
        // Keep only the last 1s of timestamps
        const cutoff = now - 1000;
        this._recentTimestamps = this._recentTimestamps.filter((t) => t >= cutoff);
      },
    });
  }

  get snapshot(): Omit<ChannelSnapshot, 'status'> {
    return {
      id: this.channelId,
      frameCount: this._frameCount,
      lastFrameAt: this._lastFrameAt,
      fps: this._recentTimestamps.length, // count in the last 1s window = fps
    };
  }

  dispose(): void {
    this._sub?.unsubscribe();
    this._sub = null;
  }
}
