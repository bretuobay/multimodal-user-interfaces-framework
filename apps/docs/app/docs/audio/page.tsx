import type { Metadata } from "next";
import { CodeBlock } from "@repo/ui";

export const metadata: Metadata = { title: "@muix/audio" };

export default async function AudioPage() {
  return (
    <>
      <h1>@muix/audio</h1>
      <p className="docs-lede">
        Microphone capture, AudioWorklet playback, and voice activity detection.
      </p>

      <h2>AudioChannel</h2>
      <p>
        Extends <code>Channel&lt;AudioFrame, AudioFrame&gt;</code>. Carries raw
        PCM data between sources and sinks.
      </p>
      <CodeBlock
        code={`import { createAudioChannel } from "@muix/audio";

const ch = createAudioChannel({ sampleRate: 48000, channelCount: 1 });
await ch.open();`}
        language="ts"
        title="audio-channel.ts"
      />

      <h2>AudioFrame</h2>
      <CodeBlock
        code={`interface AudioFrame {
  buffer: Float32Array;   // PCM samples in [-1, 1]
  sampleRate: number;
  channelCount: number;
  timestamp: number;      // AudioContext.currentTime
}`}
        language="ts"
        title="audio-frame.ts"
      />

      <h2>MicrophoneSource</h2>
      <p>
        Captures audio via <code>getUserMedia</code> and pumps{" "}
        <code>AudioFrame</code> objects into a channel using an inline{" "}
        <code>AudioWorkletNode</code> (no deprecated <code>ScriptProcessorNode</code>).
      </p>
      <CodeBlock
        code={`import { MicrophoneSource, createAudioChannel } from "@muix/audio";

const channel = createAudioChannel();
const mic = new MicrophoneSource({
  echoCancellation: true,
  noiseSuppression: true,
});

await channel.open();
await mic.start(channel);   // acquires getUserMedia

// ... later
await mic.stop();           // releases the MediaStream`}
        language="ts"
        title="microphone-source.ts"
      />

      <h2>AudioWorkletSink</h2>
      <p>Receives frames from a channel and plays them via <code>AudioContext</code>.</p>
      <CodeBlock
        code={`import { AudioWorkletSink } from "@muix/audio";

const sink = new AudioWorkletSink();
await sink.start(channel);

await sink.stop();`}
        language="ts"
        title="audio-worklet-sink.ts"
      />

      <h2>Voice Activity Detection</h2>
      <p>
        <code>createVad</code> wraps a channel observable and annotates each
        frame with an RMS level and a <code>isSpeech</code> flag. Uses a
        sliding silence-pad window to avoid rapid toggling.
      </p>
      <CodeBlock
        code={`import { createVad } from "@muix/audio";

const vadStream = createVad(channel.observe(), {
  threshold: 0.01,        // RMS below this = silence
  silencePadFrames: 10,   // frames of silence before flipping isSpeech → false
});

vadStream.subscribe({
  next: ({ frame, vad }) => {
    console.log(vad.isSpeech, vad.rms.toFixed(3));
  },
});`}
        language="ts"
        title="vad.ts"
      />
    </>
  );
}
