import type { Metadata } from "next";
import { CodeBlock } from "@repo/ui";

export const metadata: Metadata = { title: "@muix/solid" };

export default async function SolidPage() {
  return (
    <>
      <h1>@muix/solid</h1>
      <p className="docs-lede">
        Solid.js primitives — wraps MUIX signals as Solid accessors using{" "}
        <code>createSignal</code> and <code>onCleanup</code>.
      </p>

      <h2>Session context</h2>
      <CodeBlock
        code={`// root component
import { createSessionProvider, SessionContext } from "@muix/solid";

function App() {
  const { session, Provider } = createSessionProvider();

  return (
    <Provider value={session}>
      <Chat />
    </Provider>
  );
}

// child
import { useSession } from "@muix/solid";
function Chat() {
  const session = useSession();
}`}
        language="tsx"
        title="session-context.tsx"
      />

      <h2>useSignal</h2>
      <p>
        Returns a Solid signal accessor <code>() =&gt; T</code> backed by a
        MUIX <code>ReadonlySignal</code>. Subscription is cleaned up via{" "}
        <code>onCleanup</code>.
      </p>
      <CodeBlock
        code={`import { useSignal } from "@muix/solid";

function StatusBadge(props: { channel: Channel<unknown> }) {
  const status = useSignal(props.channel.status);
  return <span>{status()}</span>;
}`}
        language="tsx"
        title="use-signal.tsx"
      />

      <h2>useChannel</h2>
      <CodeBlock
        code={`const { channel, status, error } = useChannel(
  (s) => s.addChannel("my-channel"),
  session,
);
// status and error are Solid accessors: () => ChannelStatus`}
        language="ts"
        title="use-channel.ts"
      />

      <h2>useAction</h2>
      <CodeBlock
        code={`const { dispatch, status, result, cancel } = useAction(definition, session);

// status() === "running" etc.`}
        language="ts"
        title="use-action.ts"
      />

      <h2>useAgent</h2>
      <CodeBlock
        code={`const { send, history, streamingText, isStreaming, cancel, clear } =
  useAgent({ channel: agentChannel });

// history(), streamingText(), isStreaming() are all reactive accessors`}
        language="ts"
        title="use-agent.ts"
      />
    </>
  );
}
