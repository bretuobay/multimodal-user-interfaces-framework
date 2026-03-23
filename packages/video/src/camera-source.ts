/**
 * CameraSource — captures video frames from the device camera using
 * requestAnimationFrame + HTMLCanvasElement for pixel extraction.
 */

import type { VideoChannel } from './video-channel.js';
import type { CameraSourceOptions } from './types.js';

export class CameraSource {
  private _stream: MediaStream | null = null;
  private _video: HTMLVideoElement | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _rafId: number | null = null;
  private _channel: VideoChannel | null = null;
  private readonly _opts: Required<CameraSourceOptions>;

  constructor(options: CameraSourceOptions = {}) {
    this._opts = {
      width: options.width ?? 640,
      height: options.height ?? 480,
      frameRate: options.frameRate ?? 30,
      facingMode: options.facingMode ?? 'user',
    };
  }

  async start(channel: VideoChannel): Promise<void> {
    if (this._stream) return;
    this._channel = channel;

    this._stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: this._opts.width },
        height: { ideal: this._opts.height },
        frameRate: { ideal: this._opts.frameRate },
        facingMode: this._opts.facingMode,
      },
    });

    this._video = document.createElement('video');
    this._video.srcObject = this._stream;
    this._video.playsInline = true;
    await this._video.play();

    this._canvas = document.createElement('canvas');
    this._canvas.width = this._opts.width;
    this._canvas.height = this._opts.height;
    this._ctx = this._canvas.getContext('2d')!;

    this._scheduleCapture();
  }

  private _scheduleCapture(): void {
    const interval = 1000 / this._opts.frameRate;
    let lastCapture = 0;

    const loop = (now: number): void => {
      if (!this._stream) return;

      if (now - lastCapture >= interval) {
        lastCapture = now;
        this._captureFrame();
      }
      this._rafId = requestAnimationFrame(loop);
    };

    this._rafId = requestAnimationFrame(loop);
  }

  private _captureFrame(): void {
    if (!this._ctx || !this._video || !this._canvas || !this._channel) return;

    this._ctx.drawImage(this._video, 0, 0, this._opts.width, this._opts.height);
    const imageData = this._ctx.getImageData(0, 0, this._opts.width, this._opts.height);

    this._channel.sendFrame({
      data: imageData.data,
      width: this._opts.width,
      height: this._opts.height,
      timestamp: performance.now(),
    }).catch(() => {});
  }

  async stop(): Promise<void> {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._stream?.getTracks().forEach((t) => t.stop());
    this._video?.pause();

    this._stream = null;
    this._video = null;
    this._canvas = null;
    this._ctx = null;
    this._channel = null;
  }

  get isActive(): boolean {
    return this._stream !== null;
  }
}
