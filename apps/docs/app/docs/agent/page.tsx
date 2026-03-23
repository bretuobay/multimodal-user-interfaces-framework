import type { Metadata } from "next";

export const metadata: Metadata = { title: "@muix/agent" };

export default function AgentPage() {
  return (
    <>
      <h1>@muix/agent</h1>
      <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
        LLM streaming over SSE/NDJSON with tool-use support. OpenAI-compatible wire format.
      </p>

      <h2>AgentChannel</h2>
      <p>
        Extends <code>Channel&lt;AgentMessage, AgentStreamFrame&gt;</code>.
        Call <code>sendMessage()</code> (not <code>send()</code>) to start a
        streaming conversation turn; the method returns an <code>Action</code>{" "}
        you can cancel mid-stream.
      </p>
      <pre>{`import { createAgentChannel } from "@muix/agent";

const channel = createAgentChannel({
  endpoint: "/api/chat",   // your SSE endpoint
  // headers: { Authorization: "Bearer ..." },
});

await channel.open();

const action = channel.sendMessage({
  role: "user",
  content: "Summarise the MUIX framework in one paragraph.",
});

channel.observe().subscribe({
  next: ({ data: frame }) => {
    if (frame.type === "delta")   console.log(frame.content);
    if (frame.type === "done")    console.log("stream finished");
    if (frame.type === "error")   console.error(frame.content);
  },
});

// Cancel mid-stream
action.cancel();`}</pre>

      <h2>AgentStreamFrame</h2>
      <table>
        <thead><tr><th>type</th><th>Meaning</th><th>Fields</th></tr></thead>
        <tbody>
          <tr><td><code>delta</code></td><td>Incremental token</td><td><code>content: string</code></td></tr>
          <tr><td><code>tool_call</code></td><td>Tool invocation request</td><td><code>toolCall: {"{ name, args }"}</code></td></tr>
          <tr><td><code>tool_result</code></td><td>Tool response (after execution)</td><td><code>content: string</code></td></tr>
          <tr><td><code>done</code></td><td>Stream completed</td><td><code>finishReason</code></td></tr>
          <tr><td><code>error</code></td><td>Server-side error</td><td><code>content: string</code></td></tr>
        </tbody>
      </table>

      <h2>Tool registration</h2>
      <pre>{`import { createAgentChannel } from "@muix/agent";

const channel = createAgentChannel({ endpoint: "/api/chat" });

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
    const data = await fetch(\`/api/weather?city=\${city}\`).then(r => r.json());
    return JSON.stringify(data);
  },
});

// AgentChannel handles the tool_calls → execute → tool_result round-trip automatically`}</pre>

      <h2>SSE endpoint contract</h2>
      <p>
        Your endpoint must return <code>Content-Type: text/event-stream</code> with
        OpenAI-compatible delta frames:
      </p>
      <pre>{`data: {"choices":[{"delta":{"content":"Hello"}}]}

data: {"choices":[{"delta":{"content":" world"}}]}

data: [DONE]`}</pre>

      <p>NDJSON is also supported — one JSON object per line, no <code>data:</code> prefix.</p>
    </>
  );
}
