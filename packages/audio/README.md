# @muix/audio

[![npm](https://img.shields.io/npm/v/@muix/audio)](https://www.npmjs.com/package/@muix/audio)

Microphone capture, AudioWorklet playback, and voice activity detection for MUIX.

## Install

```bash
npm install @muix/audio @muix/core
```

## Usage

### MicrophoneSource

Captures audio from the microphone using `AudioWorkletNode` (not the deprecated `ScriptProcessorNode`).

```ts
import { MicrophoneSource } from "@muix/audio";
import { createChannel } from "@muix/core";

const channel = createChannel<AudioFrame>("mic");
await channel.open();

const mic = new MicrophoneSource({ channel, sampleRate: 16000 });
await mic.start();

channel.observe().subscribe({
  next: ({ data: frame }) => {
    console.log("buffer length:", frame.buffer.length, "sampleRate:", frame.sampleRate);
  },
});

// Stop capture
await mic.stop();
```

### AudioWorkletSink

Plays back `AudioFrame` data through `AudioWorkletNode`.

```ts
import { AudioWorkletSink } from "@muix/audio";

const sink = new AudioWorkletSink({ sampleRate: 24000 });
await sink.start();

// Push frames
sink.push({ buffer: new Float32Array(1024), sampleRate: 24000, channels: 1 });

await sink.stop();
```

### Voice Activity Detection (VAD)

RMS-threshold VAD with silence-padding. Wraps an `Observable<ChannelFrame<AudioFrame>>`.

```ts
import { createVad } from "@muix/audio";

const vad = createVad(channel.observe(), {
  threshold: 0.01,     // RMS threshold (0–1)
  silencePadMs: 300,   // ms of silence before emitting speech_end
});

vad.subscribe({
  next: (frame) => {
    if (frame.vad === "speech_start") console.log("speaking");
    if (frame.vad === "speech_end")   console.log("stopped");
    if (frame.vad === "silence")      { /* ignore */ }
  },
});
```

### AudioChannel

Pre-wired channel type for audio frames.

```ts
import { createAudioChannel } from "@muix/audio";

const channel = createAudioChannel("microphone");
await channel.open();
```

## Types

```ts
interface AudioFrame {
  buffer: Float32Array;
  sampleRate: number;
  channels: number;
}

type VadLabel = "speech_start" | "speech" | "speech_end" | "silence";

interface AudioFrameWithVad extends ChannelFrame<AudioFrame> {
  vad: VadLabel;
}
```

## API

| Export | Description |
|---|---|
| `MicrophoneSource` | Microphone → AudioWorklet capture |
| `AudioWorkletSink` | AudioWorklet playback sink |
| `createVad(source, options)` | Voice activity detection observable |
| `createAudioChannel(id)` | Typed channel factory |
| `computeRms(buffer)` | RMS utility |

## License

MIT
