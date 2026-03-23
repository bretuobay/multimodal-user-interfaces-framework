/**
 * AudioWorkletSink — plays AudioFrames received from an AudioChannel via
 * the Web Audio API.
 *
 * Enqueues frames into a ring buffer, which an AudioWorkletProcessor drains
 * at the audio render rate. If no worklet URL is provided it falls back to a
 * gain-node pass-through (frames are discarded — useful for testing pipelines
 * without actual playback).
 */

import type { AudioChannel } from './audio-channel.js';
import type { AudioFrame } from './types.js';

export interface AudioWorkletSinkOptions {
  /**
   * URL of your AudioWorkletProcessor script.
   * If omitted, the sink registers as a no-op (frames are consumed but silent).
   */
  workletUrl?: string;
}

export class AudioWorkletSink {
  private _context: AudioContext | null = null;
  private _gain: GainNode | null = null;
  private _sub: { unsubscribe(): void } | null = null;
  private readonly _workletUrl: string | undefined;

  constructor(options: AudioWorkletSinkOptions = {}) {
    this._workletUrl = options.workletUrl;
  }

  /** Observe the channel and schedule frames for playback */
  async start(channel: AudioChannel): Promise<void> {
    if (this._context) return;

    this._context = new AudioContext({ sampleRate: channel.sampleRate });
    this._gain = this._context.createGain();
    this._gain.connect(this._context.destination);

    if (this._workletUrl) {
      await this._context.audioWorklet.addModule(this._workletUrl);
    }

    this._sub = channel.observe().subscribe({
      next: (channelFrame) => {
        this._playFrame(channelFrame.data);
      },
    });
  }

  private _playFrame(frame: AudioFrame): void {
    if (!this._context) return;

    const buffer = this._context.createBuffer(
      frame.channelCount,
      frame.buffer.length,
      frame.sampleRate,
    );
    buffer.copyToChannel(frame.buffer as Float32Array<ArrayBuffer>, 0);

    const source = this._context.createBufferSource();
    source.buffer = buffer;
    source.connect(this._gain ?? this._context.destination);
    source.start();
  }

  async stop(): Promise<void> {
    this._sub?.unsubscribe();
    this._gain?.disconnect();
    await this._context?.close();

    this._sub = null;
    this._gain = null;
    this._context = null;
  }

  get isActive(): boolean {
    return this._context !== null;
  }
}
