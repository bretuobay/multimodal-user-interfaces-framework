# MUIX — Multimodal UI Experience Framework
## Product Requirements Document

**Version:** 1.0
**Status:** Active
**Package namespace:** `@muix/*`

---

## 1. Vision

MUIX is the default runtime layer for multimodal web interfaces.

The web has outgrown text. Interfaces now speak, listen, see, feel gesture, and reason through AI agents — yet developers still wire these modalities together ad hoc, framework-by-framework, feature-by-feature. MUIX ends that.

It is a **browser-native, streaming-first, framework-agnostic toolkit** that gives every modality — text, audio, video, motion, agent — a consistent set of primitives: a common lifecycle, a common way to stream, a common way to interrupt, and a common way to compose. Build once, run everywhere, swap the framework adapter later.

**The goal is to become the standard substrate for multimodal web UIs**, the way React Router became the standard for routing and Zod became the standard for validation — by being the right primitive at the right level of abstraction.

---

## 2. Problem Statement

### What exists today

- **Per-modality silos.** Audio is wired with the Web Audio API. Video uses MediaRecorder. Text streaming uses SSE or WebSockets. Gestures use pointer events. Each lives in a different API surface, different lifecycle model, different error handling pattern.
- **Framework lock-in.** Most "multimodal" libraries are tied to React. Vue, Solid, and Web Component developers have no equivalent.
- **No unified streaming model.** The industry default for LLM streaming (SSE/NDJSON over fetch) has no standard integration with UI frameworks. Every team writes their own streaming parser.
- **No interruptibility.** User intent changes mid-stream — cancelling a voice command, stopping a video call, overriding a half-finished AI response — but most libraries have no first-class concept of interruption.
- **Capability fragmentation.** `navigator.mediaDevices`, `SpeechRecognition`, `RTCPeerConnection`, `DeviceOrientationEvent` each have different browser support, permission models, and graceful degradation strategies. There is no unified negotiation layer.

### What MUIX solves

MUIX introduces a small, composable set of primitives that apply uniformly across every modality. Any input source (microphone, camera, gesture, text) and any output sink (speaker, canvas, DOM, LLM endpoint) is modelled as a **Channel**. Every interaction is scoped to a **Session**. Every async operation is an **Action** with built-in cancellation. Browser features are negotiated through a **Capability** registry. Rules about what is allowed are expressed as **Policies**.

With this foundation, multimodal UIs become compositional rather than ad hoc.

---

## 3. Core Primitives

Seven primitives form the entire MUIX runtime. They are defined in `@muix/core` and `@muix/capability`/`@muix/policy`. Every higher-level abstraction is built from them.

### 3.1 Observable

A minimal TC39-compatible observable for push-based streaming. No RxJS dependency. Exposes `[Symbol.observable]()` for RxJS interop where consumers need it.

```ts
interface Observable<T> {
  subscribe(observer: Partial<Observer<T>>): Subscription;
  [Symbol.observable](): Observable<T>;
}
```

**Design rationale:** RxJS adds ~30 kB min+gz and couples the entire API to its operator model. A ~150-line Observable gives correct semantics (backpressure is handled by the Channel layer, not the Observable) with zero runtime cost for consumers who don't need operators.

---

### 3.2 Signal

A reactive value — synchronous read, observable change stream. TC39 Signals-naming-compatible but own implementation (the proposal is Stage 1 with no stable shim).

```ts
interface Signal<T> {
  readonly value: T;           // synchronous read
  peek(): T;                   // read without tracking
  set(value: T): void;
  update(fn: (current: T) => T): void;
  observe(): Observable<T>;    // emits current value immediately, then changes
}

interface ComputedSignal<T> extends ReadonlySignal<T> {
  dispose(): void;
}
```

**Equality semantics:** `Object.is` by default. Pluggable via `SignalOptions.equals`.
**Framework adapters:** React's `useSignal`, Vue's `useSignal`, Solid's bridge — all subscribe to the same `Observable<T>` surface.

---

### 3.3 Channel

A duplex streaming primitive built on WHATWG `ReadableStream`/`WritableStream`. Carries typed frames with metadata, timestamps, and IDs. Native backpressure via `CountQueuingStrategy`.

```ts
interface Channel<In, Out = In> {
  readonly id: string;
  readonly status: ReadonlySignal<ChannelStatus>;
  readonly source: { readable: ReadableStream<ChannelFrame<Out>> };
  readonly sink:   { writable: WritableStream<ChannelFrame<In>> };

  open(): Promise<void>;
  close(reason?: string): Promise<void>;
  pause(): void;
  resume(): void;
  send(data: Out, options?: ChannelSendOptions): Promise<void>;
  observe(): Observable<ChannelFrame<Out>>;
  pipe<NewOut>(transform: TransformStream<Out, NewOut>): Channel<In, NewOut>;
}
```

**Why WHATWG Streams:** Native in all target browsers (Chrome 57+, Safari 14.5+, Firefox 65+). Correct backpressure semantics. `pipeThrough(TransformStream)` enables composable processing pipelines. `AbortSignal` integrates with stream cancellation natively.

**ChannelFrame:** Every value is wrapped in a frame with `id`, `timestamp`, and optional `metadata`. This gives any consumer — logging, replay, devtools — a complete event log without additional instrumentation.

---

### 3.4 Session

A bounded lifecycle container grouping Channels and state. The unit of a single user interaction or conversation.

```ts
interface Session {
  readonly id: string;
  readonly status: ReadonlySignal<SessionStatus>;  // created → active → suspended → terminated
  readonly state: Signal<Record<string, unknown>>;

  // Channel management
  addChannel<In, Out>(id: string, options?: ChannelOptions): Channel<In, Out>;
  getChannel<In, Out>(id: string): Channel<In, Out> | undefined;
  removeChannel(id: string): Promise<void>;

  // Action management
  dispatch<T>(definition: ActionDefinition<T>): Action<T>;
  cancelAction(actionId: string, reason?: string): void;

  // Lifecycle
  start(): Promise<void>;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  terminate(reason?: string): Promise<void>;

  // Events
  on<K extends keyof SessionEventMap>(event: K, handler: (payload: SessionEventMap[K]) => void): () => void;
}
```

**Session state** is a plain `Signal<Record<string, unknown>>` — no external store dependency. Framework adapters bridge it to React state via `useSignal`.

**Termination** cancels all running Actions and closes all Channels before transitioning to `terminated`. Safe to call multiple times.

---

### 3.5 Action

A cancellable async unit of work with streaming progress. Uses `AbortSignal` for cancellation.

```ts
interface Action<T> {
  readonly id: string;
  readonly type: string;
  readonly status: ReadonlySignal<ActionStatus>;  // pending → running → completed | failed | cancelled
  readonly result: ReadonlySignal<T | undefined>;
  readonly error: ReadonlySignal<unknown | null>;
  readonly signal: AbortSignal;

  observe(): Observable<ActionProgress<T>>;  // streaming progress events
  cancel(reason?: string): void;
  toPromise(): Promise<T>;                   // NOTE: not named `then` — avoids thenable trap
}
```

**`toPromise()` not `then()`:** If `Action` had a `.then` method, `await action` would unwrap the Action's result instead of returning the Action itself. This is a JavaScript spec edge case that burns developers. `toPromise()` is explicit and unambiguous.

**`ActionDefinition` supports both promise and async generator:**
```ts
interface ActionDefinition<T, P = ActionProgress<T>> {
  type: string;
  execute(signal: AbortSignal, emit: (progress: P) => void): Promise<T> | AsyncGenerator<P, T>;
}
```

---

### 3.6 Capability

A negotiated browser feature declaration with graceful degradation. Separates *detection* (no permissions) from *acquisition* (may prompt).

```ts
interface CapabilityDescriptor<T = unknown> {
  readonly id: string;         // e.g. "media:microphone"
  readonly description: string;
  probe(): Promise<CapabilityStatus>;  // detect — no permission prompt
  acquire(): Promise<T>;               // acquire — may prompt
  release(handle: T): Promise<void>;
  readonly fallbacks: ReadonlyArray<CapabilityDescriptor<T>>;
}
```

**CapabilityRegistry** caches probe results and orchestrates fallback negotiation:
```ts
registry.negotiate('media:microphone')
// → { descriptor: microphoneCapability, status: 'available' }
// or → { descriptor: fallbackCapability, status: 'degraded' }
// or → { descriptor: microphoneCapability, status: 'unavailable' }
```

**Built-in probes:** `media:microphone`, `media:camera`, `media:screen`, `speech:synthesis`, `speech:recognition`, `network:webrtc`.

---

### 3.7 Policy

Composable rules governing what operations are permitted, at what concurrency, and at what rate.

```ts
interface Policy {
  readonly id: string;
  readonly priority: number;
  evaluate(context: PolicyContext): PolicyDecision | Promise<PolicyDecision>;
}
// PolicyDecision = 'allow' | 'deny' | 'throttle'
```

**Built-in policies:**
- `PermissionPolicy` — requires specific capabilities to be available
- `ConcurrencyPolicy` — limits simultaneous operations (`maxConcurrent`, `queueExcess`)
- `RateLimitPolicy` — sliding window rate limit (`maxRequests`, `windowMs`)
- `ComposedPolicy` — AND/OR composition of multiple policies

**Evaluation:** Sync-first, async-optional. `PolicyDecision` is returned synchronously when possible (hot path for `ConcurrencyPolicy`, `RateLimitPolicy`) and asynchronously only when required (permission checks).

---

## 4. Modality Packages

Each modality is an independently installable package that binds a `CapabilityDescriptor` to a typed `Channel`.

### 4.1 Text — `@muix/text`

Streaming text: tokens, deltas, history. The foundation of LLM chat interfaces.

```ts
class TextChannel extends Channel<TextToken, TextToken> {
  sendToken(text: string, final?: boolean): Promise<void>;
  streamTokens(source: AsyncIterable<string>, signal?: AbortSignal): Promise<void>;
}

function accumulateText(frames: AsyncIterable<ChannelFrame<TextToken>>, signal?: AbortSignal): Promise<string>;
```

---

### 4.2 Agent — `@muix/agent`

LLM streaming: SSE/NDJSON parsing, tool calls, streaming response accumulation.

```ts
class AgentChannel extends Channel<AgentMessage, AgentStreamFrame> {
  sendMessage(message: AgentMessage, options?: SendOptions): Action<AgentStreamFrame[]>;
  registerTool(tool: AgentTool): void;
  readonly tools: ToolRegistry;
  readonly history: AgentMessage[];
  clearHistory(): void;
}
```

**Stream frame types:** `delta` (text token) | `tool_call` (streaming partial JSON args) | `tool_result` | `done` | `error`

**SSE parser** is OpenAI-compatible: parses `data: {...}` lines, handles `data: [DONE]`, accumulates tool call argument chunks, emits error frames on API errors.

**ToolRegistry** serializes to OpenAI function-calling format. Tool execution is automatic on `finish_reason: tool_calls` — the channel handles the round-trip.

---

### 4.3 Audio — `@muix/audio` *(Phase 2)*

```ts
class AudioChannel extends Channel<AudioFrame, AudioFrame> { ... }
class MicrophoneSource { ... }        // getUserMedia → AudioChannel
class AudioWorkletSink { ... }        // AudioChannel → AudioWorklet
class VoiceActivityDetector { ... }   // silence/speech detection
```

---

### 4.4 Video — `@muix/video` *(Phase 2)*

```ts
class VideoChannel extends Channel<ImageBitmapFrame, ImageBitmapFrame> { ... }
class CameraSource { ... }     // getUserMedia → VideoChannel
class CanvasSink { ... }       // VideoChannel → OffscreenCanvas
```

---

### 4.5 Motion — `@muix/motion` *(Phase 2)*

```ts
class MotionChannel extends Channel<PointerFrame | GestureFrame | OrientationFrame> { ... }
class PointerSource { ... }              // PointerEvents → MotionChannel
class DeviceOrientationSource { ... }    // DeviceOrientationEvent → MotionChannel
class GestureRecognizer { ... }          // tap, swipe, pinch, rotate
```

---

## 5. Framework Adapters

### 5.1 React — `@muix/react`

```ts
// Session lifecycle
<SessionProvider options={...}>{children}</SessionProvider>
useSession(): Session
useSessionStatus(session): SessionStatus

// Primitives
useSignal<T>(signal: ReadonlySignal<T>): T
useChannel<In, Out>(factory, session, deps?): { channel, status, error }
useAction<T>(definition, session): { dispatch, status, result, error, cancel }

// Agent
useAgent({ channel: AgentChannel }): {
  send, history, streamFrames, isStreaming, streamingText, cancel, clear, error
}
```

### 5.2 Vue — `@muix/vue`

Composables mirroring the React adapter shape: `provideSession`, `useSession`, `useSignal`, `useChannel`, `useAction`, `useAgent`.

### 5.3 Web Components — `@muix/wc`

Custom elements: `<muix-session>`, `<muix-channel>`.

### 5.4 Solid.js — `@muix/solid`

Solid adapter surface: `createSessionProvider`, `useSession`, `useSignal`, `useChannel`, `useAction`, `useAgent`.

---

## 6. Technical Architecture

### 6.1 Package dependency graph (strict DAG)

```
core
  └── capability
        └── policy
              ├── text
              ├── agent (→ text)
              └── react/vue/solid/wc (→ core, agent)

audio, video, motion → core, capability (only)
devtools → core, react
```

No circular dependencies. Each package builds only when its upstreams have built.

### 6.2 Build system

- **Turborepo** — task orchestration, caching, dependency topology
- **Vite** (library mode) — per-package builds, `preserveModules: false`, pure ESM output
- **vite-plugin-dts** — TypeScript declaration generation, no separate `tsc` build step
- **Vitest** — per-package tests with jsdom/node environments as appropriate
- **`sideEffects: false`** on every package — full tree-shaking

### 6.3 Module format

Pure ESM only (`"type": "module"`). Node >=18 is required. CJS is not supported — it breaks tree-shaking and adds `moduleResolution` complexity in Turborepo.

### 6.4 TypeScript

- Strict mode, `noUncheckedIndexedAccess`, `isolatedModules`
- `module: ESNext`, `moduleResolution: Bundler` for library packages
- Shared base: `@repo/typescript-config/library.json`
- No `any` in public APIs

### 6.5 Threading model

All core primitives run on the main thread. Heavy work (AudioWorklet, OffscreenCanvas) is delegated via the Channel abstraction's source/sink pattern — a `WorkerSource` or `OffscreenCanvasSink` wraps the Worker communication, exposing it as a standard `Channel`. This avoids `SharedArrayBuffer` (requires COOP/COEP headers, not universally available on hosting platforms).

---

## 7. Workload Scenarios

### Scenario 1 — LLM streaming chat (Phase 1 complete)

```
User types → AgentChannel.sendMessage() → SSE fetch → parseSSEStream()
  → AgentStreamFrame[] → useAgent().streamingText → DOM update
  → User clicks cancel → action.cancel() → AbortController.abort() → stream closes
```

### Scenario 2 — Voice assistant (Phase 2)

```
Microphone → MicrophoneSource → AudioChannel → VAD
  → silence detected → segment to AgentChannel → LLM streaming response
  → AgentStreamFrame deltas → TextChannel → SpeechSynthesis
  → User says "stop" → MotionChannel interrupt → Action.cancel()
```

### Scenario 3 — Live video with gesture overlay (Phase 2)

```
Camera → CameraSource → VideoChannel → CanvasSink
  + PointerSource → MotionChannel → GestureRecognizer
  → gesture event → Session.dispatch(action) → overlay update
```

### Scenario 4 — Agent with tool use (Phase 1 complete)

```
User message → AgentChannel.sendMessage()
  → LLM returns tool_call frame → ToolRegistry.execute()
  → tool result → automatic round-trip → continue streaming
  → done frame → action.toPromise() resolves
```

---

## 8. Non-Goals

- **No UI components.** MUIX provides primitives and adapters. Components (chat bubbles, audio visualizers, video players) are built on top — in `@repo/ui` or in application code.
- **No state management framework.** Session state is a `Signal<Record>`. Integration with Zustand, Jotai, Redux is left to the consumer.
- **No AI model hosting.** `AgentChannel` talks to any HTTP endpoint returning SSE or NDJSON. Model hosting, prompt engineering, and model selection are out of scope.
- **No WebAssembly audio/video processing.** Codec work, noise cancellation, and computer vision are extension territory (Phase 3+).
- **No CommonJS builds.** Consumers on CJS toolchains must configure their bundlers accordingly.

---

## 9. Success Metrics

| Metric | Target |
|---|---|
| Bundle size — `@muix/core` | < 8 kB min+gz |
| Bundle size — full Phase 1 tree | < 25 kB min+gz |
| Test coverage — all packages | > 90% line coverage |
| Time to first token rendered | < 100 ms from fetch response start |
| Cancelled stream cleanup | < 1 render cycle after `cancel()` |
| Zero `@muix/*` imports in final bundle when not used | Verified via bundle analysis |

---

## 10. Phased Roadmap

### Phase 1 — Core + Text + Agent + React ✅

**Exit criterion:** Working LLM streaming chat demo in `apps/web/app`.

| Package | Status |
|---|---|
| `@muix/core` | ✅ Complete — 48 tests |
| `@muix/capability` | ✅ Complete — 24 tests |
| `@muix/policy` | ✅ Complete — 23 tests |
| `@muix/text` | ✅ Complete — 5 tests |
| `@muix/agent` | ✅ Complete — 14 tests |
| `@muix/react` | ✅ Complete — 6 tests |
| Demo (`apps/web/app`) | ✅ Complete |

**Total: 95 tests, all passing.**

---

### Phase 2 — Audio + Video + Motion + Vue + Web Components ✅

**Status:** Package implementations are present in the monorepo. End-to-end demo hardening is still in progress.

| Package | Capability deps | Key classes |
|---|---|---|
| `@muix/audio` | `media:microphone`, `speech:synthesis` | `MicrophoneSource`, `AudioWorkletSink`, `createVad` |
| `@muix/video` | `media:camera`, `media:screen` | `CameraSource`, `CanvasSink` |
| `@muix/motion` | — (pointer events, device orientation) | `PointerSource`, `DeviceOrientationSource`, `GestureRecognizer` |
| `@muix/vue` | — | `provideSession`, `useSignal`, `useChannel`, `useAction`, `useAgent` |
| `@muix/wc` | — | `<muix-session>`, `<muix-channel>` custom elements |

---

### Phase 3 — WebXR + Solid + DevTools + Production Hardening 🚧

**Status:** WebXR probes, Solid adapter, DevTools package, and docs app are present. Public API freeze and production hardening remain open.

| Package | Key deliverables |
|---|---|
| `@muix/capability` (extension) | WebXR probes shipped; XRController/XRHand sources remain future work |
| `@muix/solid` | Solid.js adapter shipped |
| `@muix/devtools` | Session inspector overlay and channel frame tracer shipped |
| All packages | Public API freeze, full API docs in `apps/docs`, 60fps VideoChannel benchmark |

---

## 11. Open Questions / Future Considerations

1. **Collaboration channels.** A `CollaborationChannel` backed by WebRTC data channels or WebSockets would allow multi-user multimodal sessions. The Session/Channel model is already a natural fit — this is an extension, not a redesign.

2. **Offline/edge inference.** WebLLM, Transformers.js, and MediaPipe run models in the browser. An `AgentChannel` that routes to a local model vs. a remote API based on `CapabilityDescriptor` probe would enable offline-first multimodal UIs.

3. **Plugin registry.** Phase 3 should include a public plugin registry (npm + a `muix.config.ts` discovery file) for community-contributed modalities, capabilities, and policies.

4. **TC39 Signals migration.** When the TC39 Signals proposal stabilizes (Stage 3+), MUIX Signals should be replaced by the native implementation. The public interface is already naming-compatible.

5. **W3C alignment.** The `CapabilityDescriptor` model is intentionally aligned with the W3C Permissions API and Media Capture specs. As these specs evolve, MUIX probes can be updated to use native APIs without changing the consumer surface.

---

## 12. Quick Start

```bash
# Install
npm install @muix/core @muix/agent @muix/react

# Use in a React app
import { SessionProvider, useAgent } from '@muix/react';
import { createAgentChannel } from '@muix/agent';

const channel = createAgentChannel({ endpoint: '/api/chat' });

function Chat() {
  const { send, streamingText, isStreaming, cancel } = useAgent({ channel });

  return (
    <SessionProvider>
      <p>{streamingText}{isStreaming && '▋'}</p>
      <button onClick={() => send({ role: 'user', content: 'Hello!' })}>Send</button>
      <button onClick={cancel}>Stop</button>
    </SessionProvider>
  );
}
```
