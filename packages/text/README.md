# @muix/text

[![npm](https://img.shields.io/npm/v/@muix/text)](https://www.npmjs.com/package/@muix/text)

Streaming text channel with token accumulation for MUIX.

## Install

```bash
npm install @muix/text
```

## Usage

### TextChannel

Carries incremental string tokens and accumulates them into a full string signal.

```ts
import { createTextChannel } from "@muix/text";

const channel = createTextChannel("output");
await channel.open();

// Subscribe to the running accumulated text
channel.text.observe().subscribe({
  next: (full) => console.log("so far:", full),
});

// Push tokens as they arrive
await channel.send({ data: "Hello", timestamp: Date.now() });
await channel.send({ data: ", world", timestamp: Date.now() });

console.log(channel.text.peek()); // "Hello, world"

await channel.close();
```

### Piping from an AgentChannel

```ts
import { createAgentChannel } from "@muix/agent";
import { createTextChannel } from "@muix/text";

const agent = createAgentChannel({ endpoint: "/api/chat" });
const text  = createTextChannel("streaming-output");

await agent.open();
await text.open();

// Route delta frames into the text channel
agent.observe().subscribe({
  next: ({ data: frame }) => {
    if (frame.type === "delta" && frame.content) {
      text.send({ data: frame.content, timestamp: Date.now() }).catch(() => {});
    }
    if (frame.type === "done") {
      text.close();
    }
  },
});

agent.sendMessage({ role: "user", content: "Tell me a joke." });
```

## API

| Export | Description |
|---|---|
| `createTextChannel(id)` | Channel factory |
| `TextChannel` | Interface extending `Channel<string, string>` |

### `TextChannel`

| Member | Type | Description |
|---|---|---|
| `text` | `ReadonlySignal<string>` | Accumulated text so far |
| `send(frame)` | `Promise<void>` | Push a token |
| `reset()` | `void` | Clear the accumulator |

## License

MIT
