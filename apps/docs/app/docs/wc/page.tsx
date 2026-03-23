import type { Metadata } from "next";

export const metadata: Metadata = { title: "@muix/wc" };

export default function WcPage() {
  return (
    <>
      <h1>@muix/wc</h1>
      <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
        Custom elements for framework-free MUIX integration.
      </p>

      <h2>Registration</h2>
      <p>
        Importing the package registers both elements via{" "}
        <code>customElements.define()</code>.
      </p>
      <pre>{`import "@muix/wc";   // side-effect: registers <muix-session> and <muix-channel>`}</pre>

      <h2>&lt;muix-session&gt;</h2>
      <p>
        Creates and manages a <code>Session</code> lifecycle. Starts on connect,
        terminates on disconnect. Dispatches a <code>muix:session</code> custom
        event so children can receive the session instance.
      </p>
      <pre>{`<muix-session id="my-session" session-id="chat-session">
  <muix-channel type="text" channel-id="messages"></muix-channel>
</muix-session>

<script>
  const sessionEl = document.querySelector("muix-session");
  sessionEl.session;   // Session instance (after connectedCallback)
</script>`}</pre>

      <h2>&lt;muix-channel&gt;</h2>
      <p>
        Creates a <code>Channel</code> inside the nearest{" "}
        <code>&lt;muix-session&gt;</code> ancestor. Dispatches{" "}
        <code>muix:channel</code> (bubbles) when the channel is ready.
      </p>
      <pre>{`<muix-channel type="audio" channel-id="mic-input"></muix-channel>

<script>
  const channelEl = document.querySelector("muix-channel");
  channelEl.channel;          // Channel<unknown, unknown>
  channelEl.channelType;      // "audio"

  channelEl.addEventListener("muix:channel", (e) => {
    console.log(e.detail.channel);
  });
</script>`}</pre>

      <h2>Attributes</h2>
      <table>
        <thead><tr><th>Element</th><th>Attribute</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>&lt;muix-session&gt;</code></td><td><code>session-id</code></td><td>Forwarded to <code>{"createSession({ id })"}</code></td></tr>
          <tr><td><code>&lt;muix-channel&gt;</code></td><td><code>type</code></td><td><code>text | audio | video | motion | generic</code></td></tr>
          <tr><td><code>&lt;muix-channel&gt;</code></td><td><code>channel-id</code></td><td>Forwarded to <code>{"session.addChannel(id)"}</code></td></tr>
        </tbody>
      </table>
    </>
  );
}
