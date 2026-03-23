A cross-framework, browser-native multimodal UI framework should define a minimal set of primitives, lifecycle contracts, and capabilities that any frontend stack (React, Vue, Angular, Solid, Qwik, etc.) can bind to while staying as close as possible to Web APIs such as DOM events, WebRTC, MediaDevices, Web Speech, and Web Animations. The goal is to become the **default abstraction layer** for building LLM- and agent-driven multimodal interfaces (voice, video, text, motion, etc.) on the web, independent of rendering framework choices and future modalities. [w3](https://www.w3.org/TR/mmi-framework/)

***

## 1. Product Overview

**Product name (working):** Multimodal Primitives Framework (MPF)  
**Type:** Framework-agnostic browser library + spec  
**Primary audience:**  
- Frontend engineers building multimodal UIs in React/Vue/Angular/Solid/Qwik/Svelte  
- Platform teams maintaining design systems across multiple frameworks  
- AI product teams integrating LLMs / agents with live media and non-textual UI

**Problem statement**  
Modern multimodal interfaces (voice, video, gesture, text, sensor-driven) are implemented separately in each UI framework and product surface, leading to duplicated logic, inconsistent UX, and poor portability. Existing solutions are either framework-specific, or tightly coupled to particular rendering paradigms, blocking reuse across libraries and devices. [github](https://github.com/radix-ui/primitives/discussions/2874)

**Vision**  
Provide a browser-native, spec-driven set of **interaction primitives and runtime contracts** so that any JS framework can:  
- Bind to the same multimodal capabilities (voice, video, text, motion) through thin adapters.  
- Share interaction semantics and state machines across web apps, micro frontends, and devices.  
- Plug in LLMs/agents as “interaction managers” on top of these primitives. [academia](https://www.academia.edu/145314665/AIM_An_Abstract_Interaction_Model_for_Multi_Modal_Semantic_UI_Rendering)

***

## 2. Goals and Non-Goals

### 2.1 Goals

- Define a **small core** of multimodal interaction primitives that map directly onto Web APIs (MediaDevices, WebRTC, Web Animations, Web Speech / speech-recognition polyfills, Pointer Events, Gamepad, etc.). [geeksforgeeks](https://www.geeksforgeeks.org/javascript/web-api-webrtc-getusermedia-method/)
- Provide a **framework-agnostic JavaScript runtime** with:  
  - Stateless, functional API surface where possible.  
  - Event-driven state machines for complex flows (recording, streaming, transcription, etc.).  
- Deliver **first-party bindings** for at least React, Vue, and vanilla DOM usage to prove neutrality. [dev](https://dev.to/lubomirblazekcz/announcing-winduum-10-framework-agnostic-component-library-for-tailwindcss-4gp1)
- Support **text, audio, video, and gesture/motion** as first-class modalities, with an extension model for new ones (e.g., AR, VR, haptics). [en.wikipedia](https://en.wikipedia.org/wiki/W3C_MMI)
- Provide a **capability negotiation layer** so UIs can adapt to device/user context (e.g., mic available, low bandwidth, accessibility preferences). [w3](https://www.w3.org/TR/mmi-reqs/)
- Be **incrementally adoptable**: can be used as low-level utilities in existing apps, not requiring rewrite.  
- Be **LLM-/agent-friendly**: APIs that are easy to script/control from server or in-browser agents.

### 2.2 Non-Goals (Initial Phases)

- Not a visual component library (no opinionated UI widgets; those live in framework-specific layers).  
- Not a replacement for underlying Web APIs; instead, an abstraction + convention layer.  
- Not focused on native mobile/desktop outside the browser in v1 (but design should not prevent future ports).  
- Not a new rendering paradigm; rendering remains the job of React/Vue/etc.

***

## 3. Users and Use Cases

### 3.1 User Personas

- **Frontend product engineer** adding voice and video to an existing SPA without committing to a new UI stack.  
- **Platform / infra engineer** responsible for shared “conversation and capture” primitives across multiple apps.  
- **AI product engineer** wiring LLM and tool-calling agents to browser UIs (capturing user speech/video, streaming responses).

### 3.2 Representative Use Cases

- Click-to-talk: press a button, record audio, stream to backend/LLM, show partial and final transcripts, and play back synthesized speech.  
- Video-enabled assistance: capture camera stream, run model inference (e.g., object recognition), and overlay results.  
- Multimodal forms: type, dictate, or gesture to fill structured forms with shared validation and state.  
- Agent-driven workflows: state machines controlled by LLM/agent that can start/stop recordings, request confirmations, highlight DOM, or adjust animations.

***

## 4. High-Level Architecture

### 4.1 Core Concepts

- **Modality:** A channel of interaction: `text`, `audio-in`, `audio-out`, `video-in`, `video-out`, `pointer`, `keyboard`, `sensor/motion`, etc. [w3](https://www.w3.org/TR/mmi-framework/)
- **Capability:** A concrete feature available on the current device/environment (e.g., “front camera 720p”, “speech recognition supported”). [w3](https://www.w3.org/TR/mmi-reqs/)
- **Session:** A logical unit of interaction across modalities (e.g., one multimodal conversation) with lifecycle and state. [w3](https://www.w3.org/TR/mmi-framework/)
- **Interaction:** A specific multimodal flow composed from modalities (e.g., “voice query + text response + highlight”). [academia](https://www.academia.edu/145314665/AIM_An_Abstract_Interaction_Model_for_Multi_Modal_Semantic_UI_Rendering)
- **Adapter:** Thin framework-specific layer (React hooks, Vue composables, etc.) that binds MPF primitives into that ecosystem. [github](https://github.com/radix-ui/primitives/discussions/2874)

### 4.2 Layers

1. **Core Runtime (JS, no dependencies):**  
   - Pure functions + event emitters; no direct coupling to any framework.  
   - Uses browser primitives (DOM events, MediaDevices, WebRTC, WebAudio, Web Animations). [dev](https://dev.to/rijultp/webrtc-for-beginners-accessing-video-and-audio-in-the-browser-2mc0)

2. **Capability / Context Layer:**  
   - Detects device capabilities, permissions, bandwidth hints, and user preferences (a la “delivery context”). [w3](https://www.w3.org/TR/mmi-reqs/)

3. **Interaction Engine:**  
   - Event/state machine layer with pluggable transitions to implement flows like “record audio → stream → transcribe → respond”. [academia](https://www.academia.edu/145314665/AIM_An_Abstract_Interaction_Model_for_Multi_Modal_Semantic_UI_Rendering)

4. **Integration / Adapter Layer:**  
   - Small optional packages for React, Vue, etc. that expose idiomatic hooks/composables based on the core runtime. [dev](https://dev.to/lubomirblazekcz/announcing-winduum-10-framework-agnostic-component-library-for-tailwindcss-4gp1)

5. **Extension Layer:**  
   - Place for community-driven modality extensions (e.g., hand-gesture recognition, AR overlays).

***

## 5. Functional Requirements

### 5.1 Core Runtime

- Provide ES module, tree-shakeable bundles.  
- Expose **plain JS functions and minimal classes**; no decorators or runtime globals by default.  
- Offer an event-based API: `on(eventName, handler)`, `off`, plus stream-like APIs (e.g., async iterables).

### 5.2 Text Modality

- APIs for:  
  - Normalized input events (keyboard, IME, composition) across browsers.  
  - Input history and undo/redo hooks to support agent suggestions.  
- Optional: “semantic input events” (intent tagging, e.g., “search”, “navigate”) for agent control.

### 5.3 Audio (Voice) Modality

- **Capture:**  
  - Wrapper on `navigator.mediaDevices.getUserMedia` for audio streams; permission handling and common error cases. [blog.addpipe](https://blog.addpipe.com/getusermedia-getting-started/)
  - Optional noise-level analysis and basic VAD hooks using WebAudio.  

- **Recognition:**  
  - Abstraction over browser speech recognition where available, plus pluggable server-based ASR endpoints.  
  - Event sequence: `ready → listening → partialResult → finalResult → ended → error`.

- **Synthesis:**  
  - Abstraction over Web Speech Synthesis or streaming TTS via WebAudio or `<audio>` elements.  

### 5.4 Video Modality

- **Capture:**  
  - Unified APIs around `getUserMedia` for video streams with constraints (resolution, frame rate, front/back camera). [geeksforgeeks](https://www.geeksforgeeks.org/javascript/web-api-webrtc-getusermedia-method/)
  - Device selection (list devices, choose preferred camera).  

- **Processing hooks:**  
  - Ability to attach processors (e.g., frame callbacks) to integrate ML models (face tracking, detection).  

- **Rendering contracts:**  
  - Define how video streams should be bound to `<video>` or `<canvas>` elements without assuming framework.

### 5.5 Motion / Gesture / Pointer

- Normalized APIs for pointer events, wheel, scroll, drag, and simple gestures (tap, long press, swipe).  
- Optional integration for device orientation / motion sensors where supported.

### 5.6 Sessions and Interactions

- Session API:  
  - Create/destroy sessions, attach modalities, track lifecycle.  
  - Store session-level context (e.g., conversation ID, user profile hints).

- Interaction engine:  
  - Define interaction graphs or state machines as JSON/TS definitions.  
  - Transitions triggered by modality events (e.g., `audio.finalResult` → call backend → push text + TTS).  

### 5.7 Capability Negotiation

- Capability detection functions:  
  - `getCapabilities()` returns available modalities and properties (e.g., `supports.audioCapture`, `supports.speechRecognition`). [w3](https://www.w3.org/TR/mmi-reqs/)
- Dynamic adaptation:  
  - Events when capabilities change (device plug/unplug, permissions revoked).  

### 5.8 LLM / Agent Integration

- Generic “tool” contract: functions that can be invoked by an agent to manipulate modalities and interactions (start/stop record, show prompt, animate element).  
- Simple protocol for streaming text events (tokens, partial responses) into text modality and synchronizing with audio/video.  
- Clear, low-level interfaces that LLM tools can call without framework assumptions. [academia](https://www.academia.edu/145314665/AIM_An_Abstract_Interaction_Model_for_Multi_Modal_Semantic_UI_Rendering)

***

## 6. Non-Functional Requirements

- **Framework neutrality:** no direct imports from React/Vue/etc. in the core.  
- **Performance:**  
  - Minimal overhead over native APIs; stable performance for streaming media.  
  - Avoid unnecessary allocations in hot paths (audio/video).  

- **Accessibility:**  
  - Provide hooks and guidance for ARIA roles and announcements for multimodal interactions.  
- **Security & Privacy:**  
  - Do not store media or transcripts by default; let host app decide.  
  - Expose explicit APIs for revoking access and clearing state.  
- **Compatibility:**  
  - Modern evergreen browsers; define fallback behaviors where capabilities are missing.

***

## 7. Phased Delivery Plan

### Phase 1 – Core + Audio/Text MVP

Scope:

- Core runtime APIs (event bus, sessions).  
- Text modality events and helpers.  
- Audio capture abstraction (mic) + basic recording. [dev](https://dev.to/rijultp/webrtc-for-beginners-accessing-video-and-audio-in-the-browser-2mc0)
- Simple capability detection (`supports.audioCapture`, `supports.text`).  
- Minimal example integrations:  
  - Vanilla JS demo (no framework).  
  - React + Vue adapters for audio capture and text input.

Success metrics:

- Working end-to-end demos for “press to talk, transcribe, show text” with both React and Vue.  
- Developers can integrate without bundler hacks or polyfills.

### Phase 2 – Video + Interaction Engine

Scope:

- Video capture and device enumeration. [blog.addpipe](https://blog.addpipe.com/getusermedia-getting-started/)
- Interaction engine (state machines) for small flows.  
- Hooks for plugging in external ASR/TTS/LLM endpoints.  
- Solid + Angular adapter packages.

Success metrics:

- Example “video assistant” demo + a “voice-driven form” demo across at least 3 frameworks.  
- Teams can define an interaction graph once and use in multiple framework apps.

### Phase 3 – Motion, Advanced Capabilities, Agents

Scope:

- Gesture/motion APIs and sensors (where available).  
- Capability profiles and dynamic delivery context adaptation. [w3](https://www.w3.org/TR/mmi-framework/)
- Agent tool contracts and reference integration with a popular LLM tool-calling scheme.  
- Documentation for building custom modalities.

Success metrics:

- At least one real-world integration where an agent controls multimodal flows across multiple frontend frameworks in the same organization.

***

## 8. Developer Experience & API Design

- **Language/Type System:**  
  - Authored in TypeScript, shipped as TS types + JS bundles.  
- **API style:**  
  - Prefer simple objects and functions: `createAudioInput()`, `createSession()`, `defineInteraction()`.  
  - Events as string constants or tagged types; support async iterators for streaming.

- **Docs & Examples:**  
  - Reference docs per modality.  
  - Cookbook examples: “LLM voice chat”, “screen reader-friendly voice UI”, “video analysis overlay”.

***

## 9. Risks and Open Questions

- Variability and deprecation in browser speech APIs may require relying heavily on server-based ASR.  
- WebRTC vs. pure-recording flows: how much to abstract vs. leaving details to host app. [geeksforgeeks](https://www.geeksforgeeks.org/javascript/web-api-webrtc-getusermedia-method/)
- Balancing minimalism (close to primitives) with convenience (higher-level helpers).  
- Potential overlap with ongoing W3C multimodal work and emerging standards; alignment needed. [en.wikipedia](https://en.wikipedia.org/wiki/W3C_MMI)

***

If you like, the next step can be a **more detailed API sketch** for Phase 1 (function signatures, event names, TypeScript types) to guide implementation and framework adapters.