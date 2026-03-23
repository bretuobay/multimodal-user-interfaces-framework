/**
 * Motion modality types — pointer, orientation, and gesture events.
 */

export interface PointerEventData {
  readonly type: 'pointer';
  readonly kind: 'down' | 'move' | 'up' | 'cancel';
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
  readonly pressure: number;
  readonly pointerType: 'mouse' | 'pen' | 'touch';
  readonly timestamp: number;
}

export interface OrientationEventData {
  readonly type: 'orientation';
  /** Compass heading [0, 360) */
  readonly alpha: number | null;
  /** Front-to-back tilt [-180, 180] */
  readonly beta: number | null;
  /** Left-to-right tilt [-90, 90] */
  readonly gamma: number | null;
  readonly timestamp: number;
}

export type GestureKind = 'tap' | 'swipe' | 'pinch';

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

export interface TapGesture {
  readonly type: 'gesture';
  readonly kind: 'tap';
  readonly x: number;
  readonly y: number;
  readonly timestamp: number;
}

export interface SwipeGesture {
  readonly type: 'gesture';
  readonly kind: 'swipe';
  readonly direction: SwipeDirection;
  readonly distance: number;
  readonly velocityPxMs: number;
  readonly timestamp: number;
}

export interface PinchGesture {
  readonly type: 'gesture';
  readonly kind: 'pinch';
  /** >1 = expanding (zoom in), <1 = contracting (zoom out) */
  readonly scale: number;
  readonly timestamp: number;
}

export type GestureEventData = TapGesture | SwipeGesture | PinchGesture;

export type MotionEvent =
  | PointerEventData
  | OrientationEventData
  | GestureEventData;

export interface MotionChannelOptions {
  id?: string;
}

export interface GestureRecognizerOptions {
  /** Max ms between pointerdown and pointerup to count as a tap. Default 200 */
  tapMaxDurationMs?: number;
  /** Max movement in px to count as a tap. Default 10 */
  tapMaxMovementPx?: number;
  /** Min movement in px to count as a swipe. Default 50 */
  swipeMinDistancePx?: number;
}
