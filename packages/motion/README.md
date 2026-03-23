# @muix/motion

[![npm](https://img.shields.io/npm/v/@muix/motion)](https://www.npmjs.com/package/@muix/motion)

Pointer tracking, device orientation, and gesture recognition (tap, swipe, pinch) for MUIX.

## Install

```bash
npm install @muix/motion @muix/core
```

## Usage

### PointerSource

Captures `pointermove`, `pointerdown`, and `pointerup` events from a DOM element.

```ts
import { PointerSource } from "@muix/motion";
import { createMotionChannel } from "@muix/motion";

const channel = createMotionChannel("pointer");
await channel.open();

const pointer = new PointerSource({ channel, target: document.body });
pointer.start();

channel.observe().subscribe({
  next: ({ data: event }) => {
    console.log(event.type, event.x, event.y);
  },
});

pointer.stop();
```

### DeviceOrientationSource

Captures `deviceorientation` events (alpha/beta/gamma).

```ts
import { DeviceOrientationSource } from "@muix/motion";

const orientation = new DeviceOrientationSource({ channel });
orientation.start();

channel.observe().subscribe({
  next: ({ data: e }) => {
    if (e.type === "orientation") {
      console.log("alpha:", e.alpha, "beta:", e.beta, "gamma:", e.gamma);
    }
  },
});
```

### GestureRecognizer

A `TransformStream<MotionEvent, MotionEvent>` that passes all raw events through and additionally injects synthetic gesture events (`tap`, `swipe`, `pinch`).

```ts
import { createGestureRecognizer } from "@muix/motion";

const recognizer = createGestureRecognizer({
  tapMaxDurationMs: 200,
  swipeMinDistancePx: 50,
  pinchMinSpreadPx: 20,
});

// Pipe the motion channel through the recognizer
const gestureStream = channel.pipe(recognizer);

gestureStream.observe().subscribe({
  next: ({ data: event }) => {
    switch (event.type) {
      case "tap":    console.log("tap at", event.x, event.y); break;
      case "swipe":  console.log("swipe", event.direction, event.distancePx); break;
      case "pinch":  console.log("pinch", event.scaleDelta); break;
    }
  },
});
```

## Event types

| `type` | Source | Fields |
|---|---|---|
| `pointermove` | Pointer | `x, y, pressure` |
| `pointerdown` | Pointer | `x, y, pointerId` |
| `pointerup` | Pointer | `x, y, pointerId` |
| `orientation` | DeviceOrientation | `alpha, beta, gamma` |
| `tap` | GestureRecognizer | `x, y` |
| `swipe` | GestureRecognizer | `direction, distancePx, durationMs` |
| `pinch` | GestureRecognizer | `scaleDelta, centerX, centerY` |

## API

| Export | Description |
|---|---|
| `PointerSource` | Pointer events → channel |
| `DeviceOrientationSource` | Orientation events → channel |
| `createGestureRecognizer(options?)` | TransformStream that adds gesture events |
| `createMotionChannel(id)` | Typed channel factory |

## License

MIT
