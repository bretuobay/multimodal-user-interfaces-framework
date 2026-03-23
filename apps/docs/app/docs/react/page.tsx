import type { Metadata } from "next";

export const metadata: Metadata = { title: "@muix/react" };

export default function ReactPage() {
  return (
    <>
      <h1>@muix/react</h1>
      <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
        React hooks and context for all MUIX primitives.
      </p>

      <h2>SessionProvider</h2>
      <p>
        Creates a <code>Session</code>, starts it on mount, terminates it on
        unmount. All hooks below must be called inside a provider.
      </p>
      <pre>{`import { SessionProvider } from "@muix/react";

export default function App() {
  return (
    <SessionProvider>
      <YourApp />
    </SessionProvider>
  );
}

// Provide an existing session instead:
<SessionProvider session={mySession}>...</SessionProvider>`}</pre>

      <h2>useSession</h2>
      <pre>{`const session = useSession(); // throws if outside SessionProvider`}</pre>

      <h2>useSignal</h2>
      <p>Subscribe to any <code>ReadonlySignal</code> and re-render on change.</p>
      <pre>{`import { useSignal } from "@muix/react";

function StatusBadge({ channel }) {
  const status = useSignal(channel.status);  // "idle" | "open" | "paused" ...
  return <span>{status}</span>;
}`}</pre>

      <h2>useChannel</h2>
      <pre>{`import { useChannel } from "@muix/react";
import { createChannel } from "@muix/core";

function MyComponent() {
  const session = useSession();
  const { channel, status, error } = useChannel(
    (s) => s.addChannel("my-channel"),
    session,
  );
  // channel is stable across re-renders
}`}</pre>

      <h2>useAction</h2>
      <pre>{`import { useAction } from "@muix/react";

const definition = {
  id: "summarise",
  execute: async function* () {
    yield { type: "progress", percent: 50 };
    return "summary text";
  },
};

function SummariseButton() {
  const session = useSession();
  const { dispatch, status, result, cancel } = useAction(definition, session);

  return (
    <>
      <button onClick={dispatch} disabled={status === "running"}>Summarise</button>
      {status === "running" && <button onClick={cancel}>Cancel</button>}
      {result && <p>{result}</p>}
    </>
  );
}`}</pre>

      <h2>useAgent</h2>
      <pre>{`import { useAgent } from "@muix/react";
import { createAgentChannel } from "@muix/agent";

const agentChannel = createAgentChannel({ endpoint: "/api/chat" });

function Chat() {
  const session = useSession();
  const {
    send,
    history,
    streamingText,
    isStreaming,
    cancel,
    clear,
  } = useAgent({ channel: agentChannel, session });

  return (/* ... */);
}`}</pre>
      <table>
        <thead><tr><th>Return value</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>send</code></td><td><code>(msg: AgentMessage) =&gt; void</code></td><td>Start a new turn</td></tr>
          <tr><td><code>history</code></td><td><code>AgentMessage[]</code></td><td>Completed message pairs</td></tr>
          <tr><td><code>streamingText</code></td><td><code>string</code></td><td>In-flight tokens (empty when idle)</td></tr>
          <tr><td><code>isStreaming</code></td><td><code>boolean</code></td><td>True while receiving tokens</td></tr>
          <tr><td><code>cancel</code></td><td><code>() =&gt; void</code></td><td>Abort current turn</td></tr>
          <tr><td><code>clear</code></td><td><code>() =&gt; void</code></td><td>Reset history</td></tr>
        </tbody>
      </table>
    </>
  );
}
