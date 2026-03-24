import type { Metadata } from "next";
import { CodeBlock } from "@repo/ui";

export const metadata: Metadata = { title: "Getting Started" };

export default async function GettingStarted() {
  return (
    <>
      <h1>Getting Started</h1>
      <p className="docs-lede">
        Build a streaming LLM chat in under 5 minutes.
      </p>

      <h2>Installation</h2>
      <p>Install the packages you need. Start with core + an adapter:</p>
      <CodeBlock
        code={`# React
npm install @muix/core @muix/agent @muix/react

# Vue
npm install @muix/core @muix/agent @muix/vue

# Solid
npm install @muix/core @muix/agent @muix/solid`}
        language="bash"
        title="install.sh"
      />

      <p>
        All packages are pure ESM. Your bundler (Vite, Next.js, etc.) must
        support <code>{"\"type\": \"module\""}</code> packages.
      </p>

      <h2>Core concepts</h2>
      <p>MUIX is built on 5 primitives that compose together:</p>
      <table>
        <thead><tr><th>Primitive</th><th>Role</th></tr></thead>
        <tbody>
          <tr><td><code>Signal&lt;T&gt;</code></td><td>Reactive value. Read synchronously, subscribe to changes.</td></tr>
          <tr><td><code>Channel&lt;In, Out&gt;</code></td><td>Duplex streaming pipe built on WHATWG Streams. Handles backpressure natively.</td></tr>
          <tr><td><code>Session</code></td><td>Lifecycle container. Groups channels and actions under one managed scope.</td></tr>
          <tr><td><code>Action&lt;T&gt;</code></td><td>Cancellable async unit of work with streaming progress.</td></tr>
          <tr><td><code>Observable&lt;T&gt;</code></td><td>TC39-compatible push stream. Powers Signal subscriptions and Channel observation.</td></tr>
        </tbody>
      </table>

      <h2>Quick start — streaming chat (React)</h2>

      <h3>1. Create an API endpoint</h3>
      <CodeBlock
        code={`// app/api/chat/route.ts
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const last = messages.at(-1)?.content ?? "";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const words = \`Echo: \${last}\`.split(" ");
      for (const word of words) {
        const data = JSON.stringify({ choices: [{ delta: { content: word + " " } }] });
        controller.enqueue(encoder.encode(\`data: \${data}\\n\\n\`));
        await new Promise((r) => setTimeout(r, 40));
      }
      controller.enqueue(encoder.encode("data: [DONE]\\n\\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}`}
        language="ts"
        title="app/api/chat/route.ts"
      />

      <h3>2. Wire up the chat component</h3>
      <CodeBlock
        code={`// components/Chat.tsx
"use client";

import { createAgentChannel } from "@muix/agent";
import { SessionProvider, useSession, useAgent } from "@muix/react";
import { useState } from "react";

const channel = createAgentChannel({ endpoint: "/api/chat" });

function ChatInterface() {
  const session = useSession();
  const [input, setInput] = useState("");
  const { send, history, streamingText, isStreaming, cancel, clear } =
    useAgent({ channel, session });

  return (
    <div>
      {history.map((m, i) => (
        <div key={i}><strong>{m.role}:</strong> {m.content}</div>
      ))}
      {isStreaming && <div><strong>assistant:</strong> {streamingText}▌</div>}

      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={() => { send({ role: "user", content: input }); setInput(""); }}>
        Send
      </button>
      {isStreaming && <button onClick={cancel}>Cancel</button>}
      <button onClick={clear}>Clear</button>
    </div>
  );
}

export default function Chat() {
  return (
    <SessionProvider>
      <ChatInterface />
    </SessionProvider>
  );
}`}
        language="tsx"
        title="components/Chat.tsx"
      />

      <h3>3. Add the route</h3>
      <CodeBlock
        code={`// app/chat/page.tsx
import Chat from "../../components/Chat";
export default function ChatPage() {
  return <Chat />;
}`}
        language="tsx"
        title="app/chat/page.tsx"
      />

      <h2>Next steps</h2>
      <ul>
        <li>Add <strong>microphone input</strong> — see <a href="/docs/audio">@muix/audio</a></li>
        <li>Add <strong>camera capture</strong> — see <a href="/docs/video">@muix/video</a></li>
        <li>Add <strong>gesture recognition</strong> — see <a href="/docs/motion">@muix/motion</a></li>
        <li>Inspect sessions at runtime — see <a href="/docs/devtools">@muix/devtools</a></li>
      </ul>
    </>
  );
}
