import type { Metadata } from "next";

export const metadata: Metadata = { title: "@muix/text" };

export default function TextPage() {
  return (
    <>
      <h1>@muix/text</h1>
      <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
        Streaming text channels and token accumulation.
      </p>

      <h2>TextChannel</h2>
      <p>
        Extends <code>Channel&lt;TextToken, TextToken&gt;</code>.
        A <code>TextToken</code> is a simple <code>{"{ text: string }"}</code> object.
      </p>
      <pre>{`import { TextChannel, accumulateText } from "@muix/text";

const ch = new TextChannel();
await ch.open();

// Send tokens
await ch.sendToken("Hello");
await ch.sendToken(", ");
await ch.sendToken("world");

// Accumulate into a single string
const full = await accumulateText(ch);
console.log(full); // "Hello, world"`}</pre>

      <h2>streamTokens</h2>
      <p>Stream an array of strings with optional inter-token delay (useful for demos).</p>
      <pre>{`await ch.streamTokens(["one", " ", "two", " ", "three"], 50);
// Sends each token 50ms apart`}</pre>

      <h2>accumulateText</h2>
      <p>
        Reads all tokens from a <code>TextChannel</code> observable until the
        channel closes, then resolves with the full concatenated string.
      </p>
      <pre>{`const result = await accumulateText(ch);`}</pre>
    </>
  );
}
