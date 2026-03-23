/**
 * DeviceOrientationSource — listens to `deviceorientation` events and emits
 * OrientationEventData frames into a MotionChannel.
 */

import type { MotionChannel } from './motion-channel.js';
import type { OrientationEventData } from './types.js';

export class DeviceOrientationSource {
  private _handler: ((e: Event) => void) | null = null;

  attach(channel: MotionChannel): void {
    if (this._handler) this.detach();

    this._handler = (e: Event): void => {
      const doe = e as DeviceOrientationEvent;
      const data: OrientationEventData = {
        type: 'orientation',
        alpha: doe.alpha,
        beta: doe.beta,
        gamma: doe.gamma,
        timestamp: e.timeStamp,
      };
      channel.emit(data).catch(() => {});
    };

    window.addEventListener('deviceorientation', this._handler);
  }

  detach(): void {
    if (!this._handler) return;
    window.removeEventListener('deviceorientation', this._handler);
    this._handler = null;
  }

  get isAttached(): boolean {
    return this._handler !== null;
  }
}
