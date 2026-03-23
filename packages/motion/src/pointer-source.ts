/**
 * PointerSource — listens to Pointer Events on a target element and emits
 * PointerEventData frames into a MotionChannel.
 */

import type { MotionChannel } from './motion-channel.js';
import type { PointerEventData } from './types.js';

type PointerKind = PointerEventData['kind'];

export class PointerSource {
  private _target: EventTarget | null = null;
  private _channel: MotionChannel | null = null;
  private readonly _handlers = new Map<string, (e: Event) => void>();

  attach(target: EventTarget, channel: MotionChannel): void {
    if (this._target) this.detach();

    this._target = target;
    this._channel = channel;

    const kinds: Array<[string, PointerKind]> = [
      ['pointerdown', 'down'],
      ['pointermove', 'move'],
      ['pointerup', 'up'],
      ['pointercancel', 'cancel'],
    ];

    for (const [eventName, kind] of kinds) {
      const handler = (e: Event): void => {
        const pe = e as PointerEvent;
        const data: PointerEventData = {
          type: 'pointer',
          kind,
          pointerId: pe.pointerId,
          x: pe.clientX,
          y: pe.clientY,
          pressure: pe.pressure,
          pointerType: pe.pointerType as PointerEventData['pointerType'],
          timestamp: pe.timeStamp,
        };
        channel.emit(data).catch(() => {});
      };
      this._handlers.set(eventName, handler);
      target.addEventListener(eventName, handler);
    }
  }

  detach(): void {
    if (!this._target) return;
    for (const [name, handler] of this._handlers) {
      this._target.removeEventListener(name, handler);
    }
    this._handlers.clear();
    this._target = null;
    this._channel = null;
  }

  get isAttached(): boolean {
    return this._target !== null;
  }
}
