# @muix/core

[![npm](https://img.shields.io/npm/v/@muix/core)](https://www.npmjs.com/package/@muix/core)

The runtime foundation of MUIX — signals, channels, sessions, actions, observables, and the event bus.

## Install

```bash
npm install @muix/core
```

## Primitives

### Signal

Reactive value with synchronous read and observable subscription. Naming follows the TC39 Signals proposal.

```ts
import { createSignal } from "@muix/core";

const count = createSignal(0);

count.observe().subscribe({ next: (v) => console.log("count:", v) });

count.set(1);           // → "count: 1"
count.update((n) => n + 1);  // → "count: 2"
count.peek();           // 2 — read without tracking
```

### Observable

Own TC39-compatible implementation (~200 lines, no RxJS dependency). Exposes `[Symbol.observable]()` for RxJS interop.

```ts
import { Observable } from "@muix/core";

const obs = new Observable<number>((subscriber) => {
  subscriber.next(1);
  subscriber.next(2);
  subscriber.complete();
});

const sub = obs.subscribe({
  next: (v) => console.log(v),
  complete: () => console.log("done"),
});

sub.unsubscribe(); // clean up
```

### Channel

Duplex streaming primitive backed by WHATWG `ReadableStream`/`WritableStream` for native backpressure.

```ts
import { createChannel } from "@muix/core";

const channel = createChannel<string>("my-channel");

await channel.open();

// Write a frame
await channel.send({ data: "hello", timestamp: Date.now() });

// Subscribe to frames
channel.observe().subscribe({ next: ({ data }) => console.log(data) });

// Pipe through a transform
const upper = channel.pipe(
  new TransformStream({
    transform: (frame, c) => c.enqueue({ ...frame, data: frame.data.toUpperCase() }),
  }),
);

await channel.close();
```

### Session

Bounded lifecycle container that owns channels and dispatches actions.

```ts
import { createSession } from "@muix/core";

const session = createSession({ id: "chat" });
await session.start();

const channel = session.addChannel<string>("messages");
await channel.open();

session.on("channel:added", (e) => console.log("new channel:", e.channelId));

await session.terminate();
```

### Action

Cancellable async unit of work with streaming progress backed by `AbortSignal`.

```ts
import { createAction } from "@muix/core";

const fetchUser = createAction(async (id: string, signal) => {
  const res = await fetch(`/api/users/${id}`, { signal });
  return res.json();
});

const action = session.dispatch(fetchUser("42"));

action.observe().subscribe({
  next: ({ status }) => console.log(status),
});

// Cancel before completion
action.cancel("user navigated away");
```

### EventBus

Typed pub/sub bus scoped to a session.

```ts
import { createEventBus } from "@muix/core";

const bus = createEventBus<{ "user:joined": { name: string } }>();

bus.on("user:joined", (e) => console.log("joined:", e.name));
bus.emit("user:joined", { name: "Alice" });
```

## API

| Export | Description |
|---|---|
| `createSignal(value)` | Mutable signal |
| `createReadonlySignal(value)` | Read-only signal |
| `Observable` | TC39-compatible observable class |
| `createChannel(id)` | Generic channel |
| `createSession(options)` | Session factory |
| `createAction(fn)` | Action definition |
| `createEventBus()` | Typed event bus |

## License

MIT
