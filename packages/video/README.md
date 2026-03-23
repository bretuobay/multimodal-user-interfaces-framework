# @muix/video

[![npm](https://img.shields.io/npm/v/@muix/video)](https://www.npmjs.com/package/@muix/video)

Camera capture and canvas rendering for MUIX.

## Install

```bash
npm install @muix/video @muix/core
```

## Usage

### CameraSource

Captures frames from `getUserMedia` at a configurable frame rate.

```ts
import { CameraSource } from "@muix/video";
import { createVideoChannel } from "@muix/video";

const channel = createVideoChannel("camera");
await channel.open();

const camera = new CameraSource({ channel, fps: 30 });
await camera.start();

channel.observe().subscribe({
  next: ({ data: frame }) => {
    console.log("frame:", frame.width, "x", frame.height);
  },
});

await camera.stop();
```

### CanvasSink

Renders `MuixVideoFrame` objects onto a `<canvas>` element.

```ts
import { CanvasSink } from "@muix/video";

const canvas = document.getElementById("preview") as HTMLCanvasElement;
const sink = new CanvasSink({ canvas });

channel.observe().subscribe({
  next: ({ data: frame }) => sink.render(frame),
});
```

### VideoChannel

Pre-wired channel type for video frames.

```ts
import { createVideoChannel } from "@muix/video";

const channel = createVideoChannel("webcam");
await channel.open();
```

## Types

```ts
// Named MuixVideoFrame to avoid collision with the native VideoFrame Web API
interface MuixVideoFrame {
  imageData: ImageData;
  width: number;
  height: number;
  timestamp: number;
}
```

## API

| Export | Description |
|---|---|
| `CameraSource` | Camera → channel source |
| `CanvasSink` | Channel → canvas sink |
| `createVideoChannel(id)` | Typed channel factory |
| `MuixVideoFrame` | Frame type |

## License

MIT
