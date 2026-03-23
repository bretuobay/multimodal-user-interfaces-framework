# MUIX — Multimodal UI Experience Framework

[![CI](https://github.com/bretuobay/multimodal-user-interfaces-framework/actions/workflows/ci.yml/badge.svg)](https://github.com/bretuobay/multimodal-user-interfaces-framework/actions/workflows/ci.yml)

A browser-native, streaming-first, framework-agnostic toolkit for building multimodal web UIs — text, audio, video, motion, and agent/LLM — with adapters for React, Vue, Solid, and Web Components.

## Packages

| Package | Version | Description |
|---|---|---|
| [`@muix/core`](./packages/core) | 0.1.0 | Signal, Observable, Channel, Session, Action, EventBus |
| [`@muix/capability`](./packages/capability) | 0.1.0 | CapabilityRegistry, browser probes (media, speech, WebRTC, WebXR) |
| [`@muix/policy`](./packages/policy) | 0.1.0 | PolicyEngine, PermissionPolicy, ConcurrencyPolicy, RateLimitPolicy |
| [`@muix/text`](./packages/text) | 0.1.0 | TextChannel, streaming token accumulator |
| [`@muix/agent`](./packages/agent) | 0.1.0 | AgentChannel, SSE/NDJSON parser, ToolRegistry |
| [`@muix/audio`](./packages/audio) | 0.1.0 | AudioChannel, MicrophoneSource, AudioWorkletSink, VAD |
| [`@muix/video`](./packages/video) | 0.1.0 | VideoChannel, CameraSource, CanvasSink |
| [`@muix/motion`](./packages/motion) | 0.1.0 | MotionChannel, PointerSource, DeviceOrientationSource, GestureRecognizer |
| [`@muix/react`](./packages/react) | 0.1.0 | SessionProvider, useSignal, useChannel, useAction, useAgent |
| [`@muix/vue`](./packages/vue) | 0.1.0 | provideSession, useSignal, useChannel, useAction, useAgent |
| [`@muix/solid`](./packages/solid) | 0.1.0 | createSessionProvider, useSignal, useChannel, useAction, useAgent |
| [`@muix/wc`](./packages/wc) | 0.1.0 | `<muix-session>`, `<muix-channel>` custom elements |
| [`@muix/devtools`](./packages/devtools) | 0.1.0 | SessionInspector, ChannelTracer, `<muix-devtools>` panel |

## Quick start

```bash
npm install @muix/core @muix/agent @muix/react
```

```tsx
// Streaming LLM chat in ~20 lines
import { createAgentChannel } from "@muix/agent";
import { SessionProvider, useSession, useAgent } from "@muix/react";

const channel = createAgentChannel({ endpoint: "/api/chat" });

function Chat() {
  const session = useSession();
  const { send, history, streamingText, isStreaming } = useAgent({ channel, session });

  return (
    <>
      {history.map((m, i) => <div key={i}><b>{m.role}:</b> {m.content}</div>)}
      {isStreaming && <div><b>assistant:</b> {streamingText}▌</div>}
      <button onClick={() => send({ role: "user", content: "Hello" })}>Send</button>
    </>
  );
}

export default function App() {
  return <SessionProvider><Chat /></SessionProvider>;
}
```

See the [full docs](./apps/docs) or the [live streaming chat demo](./apps/web/app/chat).

## Architecture

All modalities follow the same pattern: a `Channel` carries typed frames between a **source** (device API) and a **sink** (renderer / consumer). A `Session` owns the lifecycle; `Signal` drives reactive state; `Action` handles cancellable async work.

```
core
 ├── capability   (browser feature detection)
 │    └── policy  (permission / concurrency / rate-limit rules)
 │         ├── text    (streaming text tokens)
 │         └── agent   (LLM streaming over SSE/NDJSON)
 ├── audio        (microphone → AudioWorklet)
 ├── video        (camera → canvas)
 └── motion       (pointer / orientation / gestures)
      └── react / vue / solid / wc   (framework adapters)
           └── devtools              (inspector panel)
```

**Key decisions:**

- **WHATWG Streams** as the Channel substrate — native backpressure, no polyfills.
- **Own Observable** (~200 lines, TC39-compatible) — no RxJS dependency, `[Symbol.observable]()` for interop.
- **Own Signal** (~150 lines) — TC39 Signals proposal naming; migration-compatible.
- **Pure ESM** — `"type": "module"`, `"sideEffects": false` on every package.
- **AudioWorkletNode** (not the deprecated `ScriptProcessorNode`) for microphone capture.

## Development

**Requirements:** Node ≥ 18, npm ≥ 10

```bash
# Install
npm install

# Build all @muix/* packages
npm run build -- --filter=@muix/*

# Run all tests
npm test -- --filter=@muix/*

# Type check
npm run check-types -- --filter=@muix/*

# Start the demo app (port 3000) + docs (port 3001)
npm run dev
```

### Running a single package

```bash
# Tests
npx turbo run test --filter=@muix/core

# Watch mode
npx turbo run test:watch --filter=@muix/agent
```

### Test counts (Phase 3)

| Package | Tests |
|---|---|
| @muix/core | 48 |
| @muix/capability | 24 |
| @muix/policy | 23 |
| @muix/text | 5 |
| @muix/agent | 14 |
| @muix/react | 6 |
| @muix/audio | 10 |
| @muix/video | 5 |
| @muix/motion | 8 |
| @muix/vue | 3 |
| @muix/solid | 3 |
| @muix/wc | 5 |
| @muix/devtools | 7 |
| **Total** | **161** |

## Apps

| App | Port | Description |
|---|---|---|
| `apps/web` | 3000 | Streaming chat demo using `@muix/react` + `@muix/agent` |
| `apps/docs` | 3001 | API reference site (14 pages, fully static) |

## CI

Every push to `main` and every PR runs:

1. `npm run build -- --filter=@muix/*` — all 13 packages
2. `npm test -- --filter=@muix/*` — all 161 tests
3. `npm run check-types -- --filter=@muix/*` — zero TypeScript errors

Matrix: Node 20 and Node 22.

## License

MIT
