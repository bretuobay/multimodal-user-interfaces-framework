# @muix/agent

[![npm](https://img.shields.io/npm/v/@muix/agent)](https://www.npmjs.com/package/@muix/agent)

LLM streaming over SSE/NDJSON with tool-use support. OpenAI-compatible wire format.

## Install

```bash
npm install @muix/agent
```

## Usage

### Basic streaming chat

```ts
import { createAgentChannel } from "@muix/agent";

const channel = createAgentChannel({ endpoint: "/api/chat" });
await channel.open();

channel.observe().subscribe({
  next: ({ data: frame }) => {
    if (frame.type === "delta")  process.stdout.write(frame.content ?? "");
    if (frame.type === "done")   console.log("\n[done]");
    if (frame.type === "error")  console.error(frame.content);
  },
});

const action = channel.sendMessage({ role: "user", content: "Hello!" });

// Cancel mid-stream if needed
// action.cancel();
```

### Tool registration

```ts
channel.registerTool({
  name: "get_weather",
  description: "Get current weather for a city",
  parameters: {
    type: "object",
    properties: {
      city: { type: "string", description: "City name" },
    },
    required: ["city"],
  },
  execute: async ({ city }) => {
    const data = await fetch(`/api/weather?city=${city}`).then((r) => r.json());
    return JSON.stringify(data);
  },
});

// AgentChannel handles the tool_call → execute → tool_result round-trip automatically
```

### SSE endpoint contract

Your endpoint must return `Content-Type: text/event-stream` with OpenAI-compatible delta frames:

```
data: {"choices":[{"delta":{"content":"Hello"}}]}

data: {"choices":[{"delta":{"content":" world"}}]}

data: [DONE]
```

NDJSON is also supported — one JSON object per line, no `data:` prefix.

## Frame types

| `type` | Meaning | Fields |
|---|---|---|
| `delta` | Incremental token | `content: string` |
| `tool_call` | Tool invocation request | `toolCall: { name, args }` |
| `tool_result` | Tool response (after execution) | `content: string` |
| `done` | Stream completed | `finishReason` |
| `error` | Server-side error | `content: string` |

## API

| Export | Description |
|---|---|
| `createAgentChannel(options)` | Channel factory |
| `AgentChannel` | Interface |
| `AgentMessage` | `{ role, content }` |
| `AgentStreamFrame` | Union of all frame types |
| `AgentTool` | Tool definition shape |

## License

MIT
