import type { Metadata } from "next";
import { CodeBlock } from "@repo/ui";

export const metadata: Metadata = { title: "@muix/text" };

export default async function TextPage() {
  return (
    <>
      <h1>@muix/text</h1>
      <p className="docs-lede">
        Streaming text channels and token accumulation.
      </p>

      <h2>TextChannel</h2>
      <p>
        Extends <code>Channel&lt;TextToken, TextToken&gt;</code>.
        A <code>TextToken</code> is a simple <code>{"{ text: string }"}</code> object.
      </p>
      <CodeBlock
        code={`import { TextChannel, accumulateText } from "@muix/text";

const ch = new TextChannel();
await ch.open();

// Send tokens
await ch.sendToken("Hello");
await ch.sendToken(", ");
await ch.sendToken("world");

// Accumulate into a single string
const full = await accumulateText(ch);
console.log(full); // "Hello, world"`}
        language="ts"
        title="text-channel.ts"
      />

      <h2>streamTokens</h2>
      <p>Stream an array of strings with optional inter-token delay (useful for demos).</p>
      <CodeBlock
        code={`await ch.streamTokens(["one", " ", "two", " ", "three"], 50);
// Sends each token 50ms apart`}
        language="ts"
        title="stream-tokens.ts"
      />

      <h2>accumulateText</h2>
      <p>
        Reads all tokens from a <code>TextChannel</code> observable until the
        channel closes, then resolves with the full concatenated string.
      </p>
      <CodeBlock
        code={`const result = await accumulateText(ch);`}
        language="ts"
        title="accumulate-text.ts"
      />
    </>
  );
}
