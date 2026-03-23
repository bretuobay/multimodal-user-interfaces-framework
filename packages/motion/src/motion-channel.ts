/**
 * MotionChannel — Channel for pointer, orientation, and gesture events.
 */

import { Channel } from '@muix/core';
import type { MotionEvent, MotionChannelOptions } from './types.js';

export class MotionChannel extends Channel<MotionEvent, MotionEvent> {
  constructor(options: MotionChannelOptions = {}) {
    super({ id: options.id });
  }

  async emit(event: MotionEvent): Promise<void> {
    await this.send(event);
  }
}

export function createMotionChannel(options?: MotionChannelOptions): MotionChannel {
  return new MotionChannel(options);
}
