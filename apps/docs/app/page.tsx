import Link from "next/link";
import { CodeBlock } from "@repo/ui";
import styles from "./page.module.css";

const heroSnippet = `import { createAgentChannel } from "@muix/agent";
import { SessionProvider, useAgent } from "@muix/react";

const channel = createAgentChannel({ endpoint: "/api/chat" });

function App() {
  const { send, streamingText, isStreaming } = useAgent({ channel });

  return (
    <>
      <button onClick={() => send({ role: "user", content: "Explain MUIX." })}>
        Start stream
      </button>
      {isStreaming && <p>{streamingText}</p>}
    </>
  );
}`;

const packages = [
  ["@muix/core", "Signal, Observable, Channel, Session, Action, EventBus"],
  ["@muix/capability", "CapabilityRegistry and browser probes for media, speech, WebRTC, and XR"],
  ["@muix/policy", "PolicyEngine and runtime guardrails for multimodal systems"],
  ["@muix/agent", "Streaming SSE/NDJSON LLM channel with tool-use support"],
  ["@muix/audio", "Microphone, playback, and VAD primitives"],
  ["@muix/video", "Camera and canvas frame pipelines"],
  ["@muix/motion", "Pointer, orientation, and gesture channels"],
  ["@muix/react", "React session provider and hooks"],
  ["@muix/devtools", "Live session inspection and frame tracing"],
];

const demoHref = process.env.NEXT_PUBLIC_WEB_DEMO_URL ?? "http://localhost:3000";

export default async function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            <span className={styles.dot} />
            Version 0.1.0
          </span>
          <h1 className={styles.title}>Multimodal UI Experience Framework</h1>
          <p className={styles.lede}>
            A browser-native, streaming-first toolkit for building text, audio,
            video, motion, and agent interfaces without coupling your runtime
            to one frontend stack.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/docs/getting-started">
              Read the guide
            </Link>
            <Link className={styles.secondary} href={demoHref}>
              Open the demo
            </Link>
            <Link className={styles.secondary} href="/docs/core">
              Browse APIs
            </Link>
          </div>
        </div>

        <div className={styles.heroRail}>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Packages</div>
              <div className={styles.statValue}>13</div>
              <div className={styles.statHint}>Core, modalities, adapters, tooling.</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Runtime model</div>
              <div className={styles.statValue}>Streaming</div>
              <div className={styles.statHint}>Channels and sessions first.</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Targets</div>
              <div className={styles.statValue}>Web-native</div>
              <div className={styles.statHint}>Built on browser primitives, not wrappers.</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Adapters</div>
              <div className={styles.statValue}>React+</div>
              <div className={styles.statHint}>React, Vue, Solid, and Web Components.</div>
            </div>
          </div>

          <div className={styles.railCard}>
            <div className={styles.railTitle}>A better default for interface runtime code</div>
            <p className={styles.railCopy}>
              MUIX treats interruption, capability detection, and live runtime
              visibility as first-class behavior, not UI afterthoughts.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>What it feels like to build with MUIX</h2>
            <p className={styles.sectionCopy}>
              The framework centers streaming channels, lightweight adapters,
              and a runtime you can inspect while it is live.
            </p>
          </div>
        </div>
        <CodeBlock
          code={heroSnippet}
          language="tsx"
          title="streaming-agent.tsx"
        />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Packages</h2>
            <p className={styles.sectionCopy}>
              Start with `@muix/core`, then compose the runtime surface you need.
            </p>
          </div>
        </div>
        <div className={styles.packageGrid}>
          {packages.map(([pkg, desc]) => (
            <div className={styles.packageCard} key={pkg}>
              <code>{pkg}</code>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Design principles</h2>
            <p className={styles.sectionCopy}>
              The framework stays small by leaning on browser standards and thin adapters.
            </p>
          </div>
        </div>
        <div className={styles.principles}>
          <div className={styles.principle}>
            <h3>Browser-native</h3>
            <p>Built on WHATWG Streams, Web Audio, Pointer Events, and platform APIs.</p>
          </div>
          <div className={styles.principle}>
            <h3>Streaming-first</h3>
            <p>Every modality maps to a channel with backpressure, pause, and resume semantics.</p>
          </div>
          <div className={styles.principle}>
            <h3>Framework-agnostic</h3>
            <p>`@muix/core` owns the runtime model; adapters stay deliberately thin.</p>
          </div>
          <div className={styles.principle}>
            <h3>Inspectable runtime</h3>
            <p>Sessions, channels, actions, and stream frames are visible while the app is running.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.links}>
          <Link className={styles.linkTile} href="/docs/getting-started">
            <h3>Quick start</h3>
            <p>Build a streaming chat in minutes.</p>
          </Link>
          <Link className={styles.linkTile} href="/docs/core">
            <h3>Core API</h3>
            <p>Review the runtime primitives and contracts.</p>
          </Link>
          <Link className={styles.linkTile} href="/docs/devtools">
            <h3>Devtools</h3>
            <p>Inspect sessions and trace frames while the UI runs.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
