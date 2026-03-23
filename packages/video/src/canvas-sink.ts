/**
 * CanvasSink — renders MuixVideoFrames onto an HTMLCanvasElement.
 */

import type { VideoChannel } from './video-channel.js';
import type { MuixVideoFrame, CanvasSinkOptions } from './types.js';

export class CanvasSink {
  private _sub: { unsubscribe(): void } | null = null;
  private readonly _autoClear: boolean;

  constructor(options: CanvasSinkOptions = {}) {
    this._autoClear = options.autoClear ?? true;
  }

  /** Attach the sink to a canvas element and start consuming frames */
  attach(canvas: HTMLCanvasElement, channel: VideoChannel): void {
    if (this._sub) this.detach();

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context from canvas');

    this._sub = channel.observe().subscribe({
      next: (channelFrame) => {
        this._drawFrame(ctx, canvas, channelFrame.data);
      },
    });
  }

  private _drawFrame(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    frame: MuixVideoFrame,
  ): void {
    if (canvas.width !== frame.width) canvas.width = frame.width;
    if (canvas.height !== frame.height) canvas.height = frame.height;

    if (this._autoClear) ctx.clearRect(0, 0, frame.width, frame.height);

    const imageData = new ImageData(
      new Uint8ClampedArray(frame.data),
      frame.width,
      frame.height,
    );
    ctx.putImageData(imageData, 0, 0);
  }

  detach(): void {
    this._sub?.unsubscribe();
    this._sub = null;
  }

  get isAttached(): boolean {
    return this._sub !== null;
  }
}
