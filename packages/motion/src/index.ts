export type {
  PointerEventData,
  OrientationEventData,
  GestureKind,
  SwipeDirection,
  TapGesture,
  SwipeGesture,
  PinchGesture,
  GestureEventData,
  MotionEvent,
  MotionChannelOptions,
  GestureRecognizerOptions,
} from './types.js';

export { MotionChannel, createMotionChannel } from './motion-channel.js';
export { PointerSource } from './pointer-source.js';
export { DeviceOrientationSource } from './device-orientation-source.js';
export { createGestureRecognizer } from './gesture-recognizer.js';
