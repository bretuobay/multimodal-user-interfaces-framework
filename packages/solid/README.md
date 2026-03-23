# @muix/solid

[![npm](https://img.shields.io/npm/v/@muix/solid)](https://www.npmjs.com/package/@muix/solid)

Solid.js primitives for MUIX — wraps MUIX signals as Solid accessors using `createSignal` and `onCleanup`.

## Install

```bash
npm install @muix/solid @muix/core
```

## Usage

### Session context

```tsx
// root component
import { createSessionProvider } from "@muix/solid";

function App() {
  const { session, Provider } = createSessionProvider();

  return (
    <Provider value={session}>
      <Chat />
    </Provider>
  );
}

// child component
import { useSession } from "@muix/solid";

function Chat() {
  const session = useSession();
}
```

### useSignal

Returns a Solid accessor `() => T` backed by a MUIX `ReadonlySignal`. Subscription is cleaned up via `onCleanup`.

```tsx
import { useSignal } from "@muix/solid";

function StatusBadge(props: { channel: Channel<unknown> }) {
  const status = useSignal(props.channel.status);
  return <span>{status()}</span>; // call as accessor
}
```

### useChannel

```tsx
const { channel, status, error } = useChannel(
  (s) => s.addChannel("my-channel"),
  session,
);
// status and error are Solid accessors: () => ChannelStatus
```

### useAction

```tsx
const { dispatch, status, result, cancel } = useAction(definition, session);

return (
  <>
    <button onClick={dispatch} disabled={status() === "running"}>Run</button>
    <Show when={status() === "running"}>
      <button onClick={cancel}>Cancel</button>
    </Show>
  </>
);
```

### useAgent

```tsx
const { send, history, streamingText, isStreaming, cancel, clear } =
  useAgent({ channel: agentChannel });

// All returns are Solid accessors — call them to read
return (
  <For each={history()}>
    {(msg) => <div><b>{msg.role}:</b> {msg.content}</div>}
  </For>
);
```

## Key difference from React

All reactive values (`status`, `result`, `history`, `streamingText`, `isStreaming`) are **Solid accessors** — zero-argument functions `() => T`. Call them like `status()`, not `status`.

## API

| Export | Description |
|---|---|
| `createSessionProvider()` | Returns `{ session, Provider }` |
| `useSession()` | Read session from context |
| `useSignal(signal)` | Solid accessor backed by MUIX signal |
| `useChannel(factory, session?)` | Create and manage a channel |
| `useAction(definition, session?)` | Manage an action |
| `useAgent(options)` | Full streaming agent primitive |

## License

MIT
