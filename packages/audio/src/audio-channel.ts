/**
 * AudioChannel — Channel specialised for raw PCM audio frames.
 */

import { Channel } from '@muix/core';
import type { AudioFrame, AudioChannelOptions } from './types.js';

export class AudioChannel extends Channel<AudioFrame, AudioFrame> {
  readonly sampleRate: number;
  readonly channelCount: number;

  constructor(options: AudioChannelOptions = {}) {
    super({ id: options.id });
    this.sampleRate = options.sampleRate ?? 48000;
    this.channelCount = options.channelCount ?? 1;
  }

  /** Convenience: send an AudioFrame without wrapping in a ChannelFrame */
  async sendFrame(frame: AudioFrame): Promise<void> {
    await this.send(frame);
  }
}

export function createAudioChannel(options?: AudioChannelOptions): AudioChannel {
  return new AudioChannel(options);
}
