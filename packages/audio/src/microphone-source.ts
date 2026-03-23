/**
 * MicrophoneSource — captures audio from the device microphone and streams
 * AudioFrames into an AudioChannel.
 *
 * Uses AudioWorkletNode with an inline processor (blob URL) to avoid the
 * deprecated ScriptProcessorNode API.
 */

import type { AudioChannel } from './audio-channel.js';
import type { MicrophoneSourceOptions } from './types.js';

/** Inline AudioWorkletProcessor source — runs in the AudioWorkletGlobalScope */
const CAPTURE_PROCESSOR_SOURCE = `
class MuixCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0] && input[0].length > 0) {
      // Transfer a copy — the browser reuses the underlying ArrayBuffer
      const copy = new Float32Array(input[0]);
      this.port.postMessage({ samples: copy, currentTime }, [copy.buffer]);
    }
    return true;
  }
}
registerProcessor('muix-capture', MuixCaptureProcessor);
`;

export class MicrophoneSource {
  private _stream: MediaStream | null = null;
  private _context: AudioContext | null = null;
  private _workletNode: AudioWorkletNode | null = null;
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

  /** Acquire microphone and wire up to the channel. */
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

    // Load the inline processor via a blob URL so no separate file is needed
    const blob = new Blob([CAPTURE_PROCESSOR_SOURCE], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    try {
      await this._context.audioWorklet.addModule(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }

    this._workletNode = new AudioWorkletNode(this._context, 'muix-capture', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: this._options.channelCount,
    });

    this._workletNode.port.onmessage = (e: MessageEvent<{ samples: Float32Array; currentTime: number }>) => {
      channel.sendFrame({
        buffer: e.data.samples,
        sampleRate: this._context!.sampleRate,
        channelCount: this._options.channelCount,
        timestamp: e.data.currentTime,
      }).catch(() => {});
    };

    this._source.connect(this._workletNode);
    // Connect to destination to keep the audio graph alive (output is silent)
    this._workletNode.connect(this._context.destination);
  }

  async stop(): Promise<void> {
    this._workletNode?.disconnect();
    this._source?.disconnect();
    this._stream?.getTracks().forEach((t) => t.stop());
    await this._context?.close();

    this._workletNode = null;
    this._source = null;
    this._stream = null;
    this._context = null;
  }

  get isActive(): boolean {
    return this._stream !== null;
  }
}
