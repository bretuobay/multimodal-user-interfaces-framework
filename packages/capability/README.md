# @muix/capability

[![npm](https://img.shields.io/npm/v/@muix/capability)](https://www.npmjs.com/package/@muix/capability)

Browser feature detection and graceful degradation for MUIX. Probes media, speech, WebRTC, clipboard, and WebXR capabilities.

## Install

```bash
npm install @muix/capability
```

## Usage

### CapabilityRegistry

```ts
import { createCapabilityRegistry } from "@muix/capability";
import { microphoneCapability, cameraCapability } from "@muix/capability";

const registry = createCapabilityRegistry();
registry.register(microphoneCapability);
registry.register(cameraCapability);

// Probe without acquiring
const status = await registry.probe("microphone");
// "available" | "unavailable" | "denied" | "degraded"

// Negotiate — picks best available from fallback chain
const { descriptor, status: s } = await registry.negotiate("microphone");
const stream = await descriptor.acquire();
```

### Built-in probes

| Export | ID | What it checks |
|---|---|---|
| `microphoneCapability` | `"microphone"` | `navigator.mediaDevices.getUserMedia({ audio: true })` |
| `cameraCapability` | `"camera"` | `navigator.mediaDevices.getUserMedia({ video: true })` |
| `speechSynthesisCapability` | `"speech-synthesis"` | `window.speechSynthesis` |
| `speechRecognitionCapability` | `"speech-recognition"` | `SpeechRecognition` / `webkitSpeechRecognition` |
| `webRtcCapability` | `"webrtc"` | `RTCPeerConnection` |
| `clipboardReadCapability` | `"clipboard-read"` | `navigator.clipboard.readText` |
| `clipboardWriteCapability` | `"clipboard-write"` | `navigator.clipboard.writeText` |
| `immersiveVrCapability` | `"immersive-vr"` | `navigator.xr?.isSessionSupported("immersive-vr")` |
| `immersiveArCapability` | `"immersive-ar"` | `navigator.xr?.isSessionSupported("immersive-ar")` |
| `inlineXrCapability` | `"inline"` | `navigator.xr?.isSessionSupported("inline")` |

### Custom capability

```ts
import type { CapabilityDescriptor } from "@muix/capability";

const myCapability: CapabilityDescriptor<WebSocket> = {
  id: "websocket",
  async probe() {
    return typeof WebSocket !== "undefined" ? "available" : "unavailable";
  },
  async acquire() {
    return new WebSocket("wss://example.com");
  },
  async release(ws) {
    ws.close();
  },
  fallbacks: [],
};
```

## API

| Export | Description |
|---|---|
| `createCapabilityRegistry()` | Registry factory |
| `microphoneCapability` | Audio input probe |
| `cameraCapability` | Video input probe |
| `speechSynthesisCapability` | TTS probe |
| `speechRecognitionCapability` | STT probe |
| `webRtcCapability` | WebRTC probe |
| `clipboardReadCapability` | Clipboard read probe |
| `clipboardWriteCapability` | Clipboard write probe |
| `immersiveVrCapability` | WebXR VR probe |
| `immersiveArCapability` | WebXR AR probe |
| `inlineXrCapability` | WebXR inline probe |

## License

MIT
