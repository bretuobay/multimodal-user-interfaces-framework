import type { Metadata } from "next";
import { CodeBlock } from "@repo/ui";

export const metadata: Metadata = { title: "@muix/devtools" };

export default async function DevtoolsPage() {
  return (
    <>
      <h1>@muix/devtools</h1>
      <p className="docs-lede">
        Real-time session inspector, channel frame-rate tracer, and a floating
        Shadow DOM panel. Zero framework dependencies.
      </p>

      <h2>SessionInspector</h2>
      <p>
        Subscribes to a Session&apos;s signals and produces{" "}
        <code>SessionSnapshot</code> objects on a configurable poll interval.
      </p>
      <CodeBlock
        code={`import { SessionInspector } from "@muix/devtools";

const inspector = new SessionInspector(session, {
  updateIntervalMs: 500,
});

inspector.start();

// Pull current state
const snap = inspector.snapshot();
// { id, status, channels: [...], actions: [...], capturedAt }

// React to changes
const unsub = inspector.onChange((snap) => {
  console.log(snap.status, snap.channels.length, "channels");
});

unsub();             // stop receiving updates
inspector.dispose(); // stop polling, unsubscribe all`}
        language="ts"
        title="session-inspector.ts"
      />

      <h2>ChannelTracer</h2>
      <p>
        Attaches to a Channel observable and tracks frame count, last-frame
        timestamp, and a 1-second sliding-window FPS estimate.
      </p>
      <CodeBlock
        code={`import { ChannelTracer } from "@muix/devtools";

const tracer = new ChannelTracer(channel);

console.log(tracer.snapshot);
// { id, frameCount, lastFrameAt, fps }

tracer.dispose();`}
        language="ts"
        title="channel-tracer.ts"
      />

      <h2>&lt;muix-devtools&gt; panel</h2>
      <p>
        A floating Shadow DOM panel that renders session state in real time.
        Drop it into any app — it is fully style-isolated via Shadow DOM.
      </p>
      <CodeBlock
        code={`import "@muix/devtools";   // registers <muix-devtools>

const panel = document.createElement("muix-devtools");
document.body.appendChild(panel);
panel.attach(session, { updateIntervalMs: 500 });

// Clean up
panel.detach();`}
        language="ts"
        title="devtools-panel.ts"
      />

      <h3>SessionSnapshot shape</h3>
      <CodeBlock
        code={`interface SessionSnapshot {
  id: string;
  status: string;
  channels: {
    id: string;
    status: string;
    frameCount: number;
    lastFrameAt: number | null;
    fps: number;
  }[];
  actions: { id: string; status: string; startedAt: number }[];
  capturedAt: number;
}`}
        language="ts"
        title="session-snapshot.ts"
      />

      <h2>Usage with React</h2>
      <CodeBlock
        code={`"use client";
import { useEffect, useRef } from "react";
import { useSession } from "@muix/react";
import "@muix/devtools";

export function DevPanel() {
  const session = useSession();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current as { attach?: (s: unknown) => void } | null;
    el?.attach?.(session);
    return () => { (el as { detach?: () => void })?.detach?.(); };
  }, [session]);

  return <muix-devtools ref={ref} />;
}`}
        language="tsx"
        title="dev-panel.tsx"
      />
    </>
  );
}
