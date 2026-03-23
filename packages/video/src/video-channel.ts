/**
 * VideoChannel — Channel specialised for raw video frames.
 */

import { Channel } from '@muix/core';
import type { MuixVideoFrame, VideoChannelOptions } from './types.js';

export class VideoChannel extends Channel<MuixVideoFrame, MuixVideoFrame> {
  readonly width: number;
  readonly height: number;
  readonly frameRate: number;

  constructor(options: VideoChannelOptions = {}) {
    super({ id: options.id });
    this.width = options.width ?? 640;
    this.height = options.height ?? 480;
    this.frameRate = options.frameRate ?? 30;
  }

  async sendFrame(frame: MuixVideoFrame): Promise<void> {
    await this.send(frame);
  }
}

export function createVideoChannel(options?: VideoChannelOptions): VideoChannel {
  return new VideoChannel(options);
}
