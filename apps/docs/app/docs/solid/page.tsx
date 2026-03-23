import type { Metadata } from "next";

export const metadata: Metadata = { title: "@muix/solid" };

export default function SolidPage() {
  return (
    <>
      <h1>@muix/solid</h1>
      <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
        Solid.js primitives — wraps MUIX signals as Solid accessors using{" "}
        <code>createSignal</code> and <code>onCleanup</code>.
      </p>

      <h2>Session context</h2>
      <pre>{`// root component
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
}`}</pre>

      <h2>useSignal</h2>
      <p>
        Returns a Solid signal accessor <code>() =&gt; T</code> backed by a
        MUIX <code>ReadonlySignal</code>. Subscription is cleaned up via{" "}
        <code>onCleanup</code>.
      </p>
      <pre>{`import { useSignal } from "@muix/solid";

function StatusBadge(props: { channel: Channel<unknown> }) {
  const status = useSignal(props.channel.status);
  return <span>{status()}</span>;
}`}</pre>

      <h2>useChannel</h2>
      <pre>{`const { channel, status, error } = useChannel(
  (s) => s.addChannel("my-channel"),
  session,
);
// status and error are Solid accessors: () => ChannelStatus`}</pre>

      <h2>useAction</h2>
      <pre>{`const { dispatch, status, result, cancel } = useAction(definition, session);

// status() === "running" etc.`}</pre>

      <h2>useAgent</h2>
      <pre>{`const { send, history, streamingText, isStreaming, cancel, clear } =
  useAgent({ channel: agentChannel });

// history(), streamingText(), isStreaming() are all reactive accessors`}</pre>
    </>
  );
}
