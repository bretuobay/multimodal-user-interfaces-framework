/**
 * GestureRecognizer — detects tap, swipe, and pinch gestures from a stream
 * of PointerEventData frames.
 *
 * Returns a TransformStream<MotionEvent, MotionEvent> that passes through all
 * raw events and additionally synthesises gesture events.
 */

import type {
  MotionEvent,
  PointerEventData,
  GestureRecognizerOptions,
  SwipeDirection,
} from './types.js';

interface PointerTrack {
  startX: number;
  startY: number;
  startTime: number;
  lastX: number;
  lastY: number;
}

function swipeDirection(dx: number, dy: number): SwipeDirection {
  return Math.abs(dx) >= Math.abs(dy)
    ? dx > 0 ? 'right' : 'left'
    : dy > 0 ? 'down' : 'up';
}

export function createGestureRecognizer(
  options: GestureRecognizerOptions = {},
): TransformStream<MotionEvent, MotionEvent> {
  const tapMaxDuration = options.tapMaxDurationMs ?? 200;
  const tapMaxMove = options.tapMaxMovementPx ?? 10;
  const swipeMinDist = options.swipeMinDistancePx ?? 50;

  // Track active pointers: pointerId → track
  const pointers = new Map<number, PointerTrack>();

  return new TransformStream<MotionEvent, MotionEvent>({
    transform(event, controller) {
      // Always pass through the raw event
      controller.enqueue(event);

      if (event.type !== 'pointer') return;
      const pe = event as PointerEventData;

      switch (pe.kind) {
        case 'down':
          pointers.set(pe.pointerId, {
            startX: pe.x,
            startY: pe.y,
            startTime: pe.timestamp,
            lastX: pe.x,
            lastY: pe.y,
          });
          break;

        case 'move': {
          const track = pointers.get(pe.pointerId);
          if (track) {
            track.lastX = pe.x;
            track.lastY = pe.y;
          }

          // Pinch detection: two active pointers
          if (pointers.size === 2) {
            const [a, b] = [...pointers.values()] as [PointerTrack, PointerTrack];
            const currentDist = Math.hypot(a.lastX - b.lastX, a.lastY - b.lastY);
            const startDist = Math.hypot(a.startX - b.startX, a.startY - b.startY);
            if (startDist > 0) {
              const scale = currentDist / startDist;
              // Only emit if scale changed meaningfully
              if (Math.abs(scale - 1) > 0.02) {
                controller.enqueue({
                  type: 'gesture',
                  kind: 'pinch',
                  scale,
                  timestamp: pe.timestamp,
                });
                // Reset start positions to current for incremental scale
                for (const t of pointers.values()) {
                  t.startX = t.lastX;
                  t.startY = t.lastY;
                }
              }
            }
          }
          break;
        }

        case 'up':
        case 'cancel': {
          const track = pointers.get(pe.pointerId);
          pointers.delete(pe.pointerId);

          if (!track || pe.kind === 'cancel') break;

          const duration = pe.timestamp - track.startTime;
          const dx = pe.x - track.startX;
          const dy = pe.y - track.startY;
          const distance = Math.hypot(dx, dy);

          if (duration <= tapMaxDuration && distance <= tapMaxMove) {
            // Tap
            controller.enqueue({
              type: 'gesture',
              kind: 'tap',
              x: pe.x,
              y: pe.y,
              timestamp: pe.timestamp,
            });
          } else if (distance >= swipeMinDist) {
            // Swipe
            controller.enqueue({
              type: 'gesture',
              kind: 'swipe',
              direction: swipeDirection(dx, dy),
              distance,
              velocityPxMs: duration > 0 ? distance / duration : 0,
              timestamp: pe.timestamp,
            });
          }
          break;
        }
      }
    },
    flush() {
      pointers.clear();
    },
  });
}
