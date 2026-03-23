# @muix/devtools

[![npm](https://img.shields.io/npm/v/@muix/devtools)](https://www.npmjs.com/package/@muix/devtools)

Session inspector, channel frame-rate tracer, and a floating `<muix-devtools>` panel for debugging MUIX applications.

## Install

```bash
npm install --save-dev @muix/devtools @muix/core
```

> Add to `devDependencies` — this package is for development only.

## Usage

### SessionInspector

Polls session state and notifies on changes.

```ts
import { createSessionInspector } from "@muix/devtools";

const inspector = createSessionInspector(session, { intervalMs: 500 });

inspector.onChange((snapshot) => {
  console.log("session:", snapshot.id, snapshot.status);
  console.log("channels:", snapshot.channels.map((c) => `${c.id}(${c.status})`));
});

// Stop polling
inspector.dispose();
```

### ChannelTracer

Tracks frame throughput in frames-per-second using a 1-second sliding window.

```ts
import { createChannelTracer } from "@muix/devtools";

const tracer = createChannelTracer(channel);

tracer.onFrame((fps) => {
  console.log("channel fps:", fps);
});

// Stop tracing
tracer.dispose();
```

### `<muix-devtools>` custom element

A style-isolated floating panel (Shadow DOM) that shows live session and channel state. Drop it anywhere in the DOM — no framework required.

```html
<!-- development only -->
<muix-devtools></muix-devtools>

<script type="module">
  import "@muix/devtools"; // registers <muix-devtools>

  const panel = document.querySelector("muix-devtools");
  panel.attach(session); // start displaying this session

  // Detach when done
  // panel.detach();
</script>
```

### Programmatic attachment

```ts
import { DevtoolsElement } from "@muix/devtools";

customElements.whenDefined("muix-devtools").then(() => {
  const panel = document.createElement("muix-devtools") as DevtoolsElement;
  document.body.appendChild(panel);
  panel.attach(session);
});
```

## Panel contents

The floating panel displays:

- Session ID and status
- Per-channel status and live fps
- Last error per channel (if any)

## API

| Export | Description |
|---|---|
| `createSessionInspector(session, options?)` | Poll-based session state watcher |
| `createChannelTracer(channel)` | FPS sliding-window tracker |
| `DevtoolsElement` | `<muix-devtools>` class |
| `SessionSnapshot` | Inspector snapshot type |

## License

MIT
