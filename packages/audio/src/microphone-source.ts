/**
 * MicrophoneSource — captures audio from the device microphone and streams
 * AudioFrames into an AudioChannel.
 *
 * Uses ScriptProcessorNode (deprecated but universally available) as the
 * primary capture path. An AudioWorklet path can be swapped in per-app.
 */

import type { AudioChannel } from './audio-channel.js';
import type { MicrophoneSourceOptions } from './types.js';

export class MicrophoneSource {
  private _stream: MediaStream | null = null;
  private _context: AudioContext | null = null;
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  private _processor: ScriptProcessorNode | null = null;
  private _source: MediaStreamAudioSourceNode | null = null;
  private readonly _options: Required<MicrophoneSourceOptions>;

  constructor(options: MicrophoneSourceOptions = {}) {
    this._options = {
      sampleRate: options.sampleRate ?? 48000,
      channelCount: options.channelCount ?? 1,
      echoCancellation: options.echoCancellation ?? true,
      noiseSuppression: options.noiseSuppression ?? true,
      autoGainControl: options.autoGainControl ?? true,
    };
  }

  /** Acquire microphone, wire up to the channel. Call channel.open() first. */
  async start(channel: AudioChannel): Promise<void> {
    if (this._stream) return;

    this._stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: this._options.sampleRate,
        channelCount: this._options.channelCount,
        echoCancellation: this._options.echoCancellation,
        noiseSuppression: this._options.noiseSuppression,
        autoGainControl: this._options.autoGainControl,
      },
    });

    this._context = new AudioContext({ sampleRate: this._options.sampleRate });
    this._source = this._context.createMediaStreamSource(this._stream);

    // 4096-sample buffer, mono in, mono out
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    this._processor = this._context.createScriptProcessor(
      4096,
      this._options.channelCount,
      this._options.channelCount,
    );

    this._processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      // Copy — the underlying buffer is reused by the browser
      const buffer = new Float32Array(input.length);
      buffer.set(input);

      channel.sendFrame({
        buffer,
        sampleRate: this._context!.sampleRate,
        channelCount: this._options.channelCount,
        timestamp: e.playbackTime,
      }).catch(() => {});
    };

    this._source.connect(this._processor);
    this._processor.connect(this._context.destination);
  }

  /** Stop capture and release all resources */
  async stop(): Promise<void> {
    this._processor?.disconnect();
    this._source?.disconnect();
    this._stream?.getTracks().forEach((t) => t.stop());
    await this._context?.close();

    this._processor = null;
    this._source = null;
    this._stream = null;
    this._context = null;
  }

  get isActive(): boolean {
    return this._stream !== null;
  }
}
