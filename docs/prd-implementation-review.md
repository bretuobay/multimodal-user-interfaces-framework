# PRD Review Against Current Implementation

Date: 2026-03-23

This review compares [prd.md](/home/bretuobay/prjts/multimodal-user-interfaces-framework/docs/prd.md) to the current repository state. It focuses on observable implementation, shipped package surface, and demo/docs behavior.

## Executive Summary

The current repository is materially ahead of the PRD roadmap in package breadth, but behind the PRD in a few core runtime guarantees.

- The PRD still presents the project as Phase 1 complete with Phase 2 and 3 mostly future work, but the repo already ships `audio`, `video`, `motion`, `vue`, `solid`, `wc`, and `devtools` packages and a docs site labeled "Phase 3" ([docs/prd.md:440](/home/bretuobay/prjts/multimodal-user-interfaces-framework/docs/prd.md#L440), [apps/docs/app/page.tsx:7](/home/bretuobay/prjts/multimodal-user-interfaces-framework/apps/docs/app/page.tsx#L7), [packages/audio/src/index.ts:1](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/audio/src/index.ts#L1), [packages/devtools/src/index.ts:1](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/devtools/src/index.ts#L1)).
- Several headline PRD behaviors are not implemented as specified: `Channel.sink.writable` is not connected to the outbound stream, async-generator `ActionDefinition` final return values are not recovered correctly, the React agent path does not receive streaming progress, and devtools channel tracking does not match the emitted session event payload ([packages/core/src/channel.ts:97](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/core/src/channel.ts#L97), [packages/core/src/session.ts:185](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/core/src/session.ts#L185), [packages/core/src/action.ts:190](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/core/src/action.ts#L190), [packages/agent/src/agent-channel.ts:108](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/agent/src/agent-channel.ts#L108), [packages/react/src/use-agent.ts:57](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/react/src/use-agent.ts#L57), [packages/devtools/src/session-inspector.ts:28](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/devtools/src/session-inspector.ts#L28)).
- The PRD’s demo/documentation references are stale. The PRD says the Phase 1 demo is complete in `apps/web/app/chat`, but that route now redirects to `/` and the chat demo actually renders from the home page ([docs/prd.md:442](/home/bretuobay/prjts/multimodal-user-interfaces-framework/docs/prd.md#L442), [apps/web/app/chat/page.tsx:1](/home/bretuobay/prjts/multimodal-user-interfaces-framework/apps/web/app/chat/page.tsx#L1), [apps/web/app/page.tsx:1](/home/bretuobay/prjts/multimodal-user-interfaces-framework/apps/web/app/page.tsx#L1)).

## Where Implementation Is Ahead Of The PRD

### Roadmap state is understated

The PRD positions these as future phases:

- Phase 2: `@muix/audio`, `@muix/video`, `@muix/motion`, `@muix/vue`, `@muix/wc` ([docs/prd.md:458](/home/bretuobay/prjts/multimodal-user-interfaces-framework/docs/prd.md#L458))
- Phase 3: `@muix/solid`, `@muix/devtools`, WebXR extension, full docs ([docs/prd.md:472](/home/bretuobay/prjts/multimodal-user-interfaces-framework/docs/prd.md#L472))

Current repo state already exports those packages:

- Audio is present with `AudioChannel`, `MicrophoneSource`, `AudioWorkletSink`, and VAD helpers ([packages/audio/src/index.ts:9](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/audio/src/index.ts#L9))
- Video is present with `VideoChannel`, `CameraSource`, and `CanvasSink` ([packages/video/src/index.ts:8](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/video/src/index.ts#L8))
- Motion is present with `MotionChannel`, `PointerSource`, `DeviceOrientationSource`, and gesture recognition ([packages/motion/src/index.ts:15](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/motion/src/index.ts#L15))
- Vue, Solid, WC, and DevTools packages all export usable surfaces today ([packages/vue/src/index.ts:1](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/vue/src/index.ts#L1), [packages/solid/src/index.ts:1](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/solid/src/index.ts#L1), [packages/wc/src/index.ts:1](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/wc/src/index.ts#L1), [packages/devtools/src/index.ts:1](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/devtools/src/index.ts#L1))
- The docs home page explicitly labels the current state as `v0.1.0 — Phase 3` ([apps/docs/app/page.tsx:7](/home/bretuobay/prjts/multimodal-user-interfaces-framework/apps/docs/app/page.tsx#L7))

### Capability scope is ahead of the PRD text

The PRD’s built-in probe list mentions microphone, camera, screen, speech synthesis, speech recognition, and WebRTC ([docs/prd.md:180](/home/bretuobay/prjts/multimodal-user-interfaces-framework/docs/prd.md#L180)). Current exports also include WebXR capability probes (`immersive-vr`, `immersive-ar`, `inline`) ([packages/capability/src/index.ts:15](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/capability/src/index.ts#L15), [packages/capability/src/probes/webxr.ts:34](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/capability/src/probes/webxr.ts#L34)).

## Where Implementation Matches The PRD Broadly

- Core package structure exists as described: observable, signal, channel, action, session, capability registry, policy engine, text channel, and agent channel are all present as first-class packages and exports.
- The repo is a Turborepo monorepo with package-per-concern organization, matching the PRD’s architecture and build assumptions ([package.json:4](/home/bretuobay/prjts/multimodal-user-interfaces-framework/package.json#L4)).
- The demo API route uses SSE-style streaming responses, which aligns with the PRD’s streaming-first design for agent interactions ([apps/web/app/api/chat/route.ts:1](/home/bretuobay/prjts/multimodal-user-interfaces-framework/apps/web/app/api/chat/route.ts#L1)).

## Gaps And Contradictions

### 1. `Channel` does not satisfy the PRD’s duplex contract

The PRD defines `Channel` as a duplex primitive with `source.readable` and `sink.writable`, where the writable side writes into the channel ([docs/prd.md:75](/home/bretuobay/prjts/multimodal-user-interfaces-framework/docs/prd.md#L75)). In the implementation, `sink.writable` is backed by `_inboundTransform`, but that stream is never connected to `_transform`, `source.readable`, or `observe()` ([packages/core/src/channel.ts:65](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/core/src/channel.ts#L65), [packages/core/src/channel.ts:97](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/core/src/channel.ts#L97), [packages/core/src/channel.ts:107](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/core/src/channel.ts#L107)).

Impact:

- `sink.writable` is effectively dead from a consumer perspective.
- The PRD’s source/sink abstraction and threading model are overstated in current code.
- Packages built around sources and sinks are relying on `send()` and `observe()`, not on the advertised duplex wiring.

### 2. Async-generator actions do not preserve final return values correctly

The PRD explicitly supports `ActionDefinition.execute()` returning an async generator whose yielded values are progress and whose return value is the final result ([docs/prd.md:146](/home/bretuobay/prjts/multimodal-user-interfaces-framework/docs/prd.md#L146)). Both `Session.dispatch()` and `runAction()` consume the generator with `for await` and then call `gen.return(undefined)` to recover the result ([packages/core/src/session.ts:185](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/core/src/session.ts#L185), [packages/core/src/action.ts:190](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/core/src/action.ts#L190)).

That does not recover the generator’s original return value after normal completion. The likely outcome is an `undefined` final result for async-generator actions.

Impact:

- The documented `ActionDefinition` contract is not reliable for generator-based actions.
- Scenario flows that depend on progress plus final result are underspecified in tests.

### 3. React agent streaming path is inconsistent with `AgentChannel`

The PRD’s Scenario 1 depends on `AgentChannel.sendMessage()` driving `useAgent().streamingText` during the stream ([docs/prd.md:379](/home/bretuobay/prjts/multimodal-user-interfaces-framework/docs/prd.md#L379)). In code:

- `useAgent()` listens to `action.observe()` and expects `progress.partial` to contain `AgentStreamFrame[]` snapshots ([packages/react/src/use-agent.ts:57](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/react/src/use-agent.ts#L57))
- `AgentChannel.sendMessage()` accumulates frames locally, but never calls `action._emitProgress(...)` ([packages/agent/src/agent-channel.ts:65](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/agent/src/agent-channel.ts#L65))

Impact:

- `streamingText` and `streamFrames` in the React hook are not updated from the action path as implemented.
- The current React demo path does not match the PRD’s stated streaming flow.
- This gap is not covered by the current React tests, which only validate `useSignal` and session context behavior ([packages/react/src/test/hooks.test.tsx:1](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/react/src/test/hooks.test.tsx#L1)).

### 4. DevTools channel tracking is wired to the wrong event payload

Phase 3 in the PRD calls for a working devtools inspector ([docs/prd.md:487](/home/bretuobay/prjts/multimodal-user-interfaces-framework/docs/prd.md#L487)). `SessionInspector` subscribes to `channel:added` but expects the event payload to contain a `channel` object ([packages/devtools/src/session-inspector.ts:27](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/devtools/src/session-inspector.ts#L27)). `Session` actually emits `{ channelId }` only ([packages/core/src/session.ts:166](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/core/src/session.ts#L166)).

Impact:

- Devtools cannot create `ChannelTracer` instances from session events as written.
- The package exists, but one of its core runtime integrations is currently broken.

### 5. Demo and quick-start references are stale

The PRD says the Phase 1 exit criterion is a working chat demo in `apps/web/app/chat` ([docs/prd.md:442](/home/bretuobay/prjts/multimodal-user-interfaces-framework/docs/prd.md#L442)). The actual `apps/web/app/chat/page.tsx` just redirects to `/` ([apps/web/app/chat/page.tsx:1](/home/bretuobay/prjts/multimodal-user-interfaces-framework/apps/web/app/chat/page.tsx#L1)), and the app root renders the chat component ([apps/web/app/page.tsx:1](/home/bretuobay/prjts/multimodal-user-interfaces-framework/apps/web/app/page.tsx#L1)).

Impact:

- The roadmap completion criteria are out of date.
- A reader following the PRD literally will look in the wrong place for the shipped demo.

### 6. PRD examples have adapter API drift

The PRD presents React, Vue, WC, and Solid as phased adapters with specific surfaces ([docs/prd.md:293](/home/bretuobay/prjts/multimodal-user-interfaces-framework/docs/prd.md#L293)). The repo has those adapters, but the exact APIs have drifted from the PRD examples.

Examples:

- PRD quick start shows `useAgent({ channel })` inside a `SessionProvider`, but the React hook itself does not take or use a `session`, despite earlier README-style examples implying that linkage.
- Vue exports `provideSession` rather than a component-style provider surface ([packages/vue/src/index.ts:6](/home/bretuobay/prjts/multimodal-user-interfaces-framework/packages/vue/src/index.ts#L6)).
- Solid exports `createSessionProvider`, which is beyond the PRD’s wording that described it as a Phase 3 bridge, but the exact lifecycle/documentation should be updated together.

This is not a blocker by itself, but it means the PRD is no longer a precise source of truth for public adapter APIs.

## Recommendations

1. Update the PRD roadmap and package status sections to reflect current repo state instead of Phase 1-only completion.
2. Either wire `Channel.sink.writable` into the actual channel pipeline or narrow the PRD contract so it matches the current implementation.
3. Fix generator action completion semantics in both `runAction()` and `Session.dispatch()`, then add explicit tests for async-generator return values.
4. Make `AgentChannel.sendMessage()` emit progress frames or refactor `@muix/react` `useAgent()` to consume `channel.observe()` consistently, then add integration tests for streaming text updates.
5. Fix devtools to derive channels from `channelId` plus `session.getChannel()` or change the session event payload to include the channel instance.
6. Refresh PRD references to the current demo route and current adapter APIs.

## Confidence

High confidence on package-presence and API-drift findings.

Medium-high confidence on runtime behavior gaps where the contradiction is directly visible in code but not currently covered by an existing test:

- `Channel.sink.writable` not being connected
- async-generator final result handling
- React agent streaming progress
- devtools channel event payload mismatch

## Validation Performed

- Reviewed the PRD and compared it against the exported package surfaces, representative implementations, demo routes, and docs app.
- Ran `npm test -- --filter=@muix/*` at the repo root on 2026-03-23. All package test suites passed.
- The passing test run does not invalidate the main gaps above; several are contract mismatches that are not covered by the current tests.
