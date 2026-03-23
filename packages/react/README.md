# @muix/react

[![npm](https://img.shields.io/npm/v/@muix/react)](https://www.npmjs.com/package/@muix/react)

React hooks and context for MUIX — signals, channels, sessions, actions, and LLM streaming.

## Install

```bash
npm install @muix/react @muix/core
```

## Quick start — streaming chat

```tsx
import { createAgentChannel } from "@muix/agent";
import { SessionProvider, useSession, useAgent } from "@muix/react";

const channel = createAgentChannel({ endpoint: "/api/chat" });

function Chat() {
  const session = useSession();
  const { send, history, streamingText, isStreaming, cancel, clear } =
    useAgent({ channel, session });

  return (
    <>
      {history.map((m, i) => (
        <div key={i}><b>{m.role}:</b> {m.content}</div>
      ))}
      {isStreaming && <div><b>assistant:</b> {streamingText}▌</div>}
      <button onClick={() => send({ role: "user", content: "Hello" })}>Send</button>
      {isStreaming && <button onClick={cancel}>Stop</button>}
    </>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <Chat />
    </SessionProvider>
  );
}
```

## Hooks

### `useSession`

Returns the nearest `Session` from context.

```tsx
const session = useSession();
```

### `useSignal`

Subscribes to a MUIX `ReadonlySignal` and re-renders on change.

```tsx
import { useSignal } from "@muix/react";

function StatusBadge({ channel }: { channel: Channel<unknown> }) {
  const status = useSignal(channel.status);
  return <span className={status}>{status}</span>;
}
```

### `useChannel`

Creates a channel inside the session and closes it on unmount.

```tsx
const { channel, status, error } = useChannel(
  (s) => s.addChannel("messages"),
  session,
);
```

### `useAction`

Manages an action's lifecycle with automatic cleanup.

```tsx
const { dispatch, status, result, cancel } = useAction(fetchUserAction, session);

return (
  <>
    <button onClick={dispatch} disabled={status === "running"}>Load</button>
    {status === "running" && <button onClick={cancel}>Cancel</button>}
    {result && <pre>{JSON.stringify(result)}</pre>}
  </>
);
```

### `useAgent`

Full streaming agent hook with history management.

```tsx
const { send, history, streamingText, isStreaming, cancel, clear } =
  useAgent({ channel: agentChannel });
```

| Return | Type | Description |
|---|---|---|
| `send` | `(msg: AgentMessage) => void` | Send a message |
| `history` | `AgentMessage[]` | Completed turns |
| `streamingText` | `string` | Partial text in-flight |
| `isStreaming` | `boolean` | Whether a stream is active |
| `cancel` | `() => void` | Cancel the current stream |
| `clear` | `() => void` | Reset history |

## API

| Export | Description |
|---|---|
| `SessionProvider` | Context provider that creates and manages a `Session` |
| `useSession()` | Consume session from context |
| `useSignal(signal)` | Subscribe to a MUIX signal |
| `useChannel(factory, session?)` | Create and manage a channel |
| `useAction(definition, session?)` | Manage an action |
| `useAgent(options)` | Full streaming agent hook |

## License

MIT
