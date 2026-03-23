import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "5rem 2rem" }}>
      <div style={{ marginBottom: "0.75rem" }}>
        <span className="badge">v0.1.0 — Phase 3</span>
      </div>

      <h1 style={{ fontSize: "2.75rem", marginBottom: "1.25rem", letterSpacing: "-0.02em" }}>
        Multimodal UI<br />Experience Framework
      </h1>

      <p style={{ fontSize: "1.2rem", color: "var(--muted)", marginBottom: "2.5rem", lineHeight: 1.7 }}>
        A browser-native, streaming-first, framework-agnostic toolkit for building
        multimodal web UIs — text, audio, video, motion, and agent/LLM — with
        adapters for React, Vue, Solid, and Web Components.
      </p>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "4rem", flexWrap: "wrap" }}>
        <Link
          href="/docs/getting-started"
          style={{
            background: "var(--accent)",
            color: "#fff",
            padding: "0.65rem 1.5rem",
            borderRadius: 6,
            fontWeight: 600,
            fontSize: "0.95rem",
          }}
        >
          Get started →
        </Link>
        <Link
          href="/docs/core"
          style={{
            background: "var(--code-bg)",
            color: "var(--fg)",
            padding: "0.65rem 1.5rem",
            borderRadius: 6,
            fontWeight: 600,
            fontSize: "0.95rem",
            border: "1px solid var(--border)",
          }}
        >
          API reference
        </Link>
      </div>

      <hr />

      <h2 style={{ borderBottom: "none", marginTop: "2.5rem" }}>Packages</h2>

      <table style={{ marginTop: "1rem" }}>
        <thead>
          <tr>
            <th>Package</th>
            <th>What it provides</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["@muix/core", "Signal, Observable, Channel, Session, Action, EventBus"],
            ["@muix/capability", "CapabilityRegistry, browser probes (media, speech, WebRTC, WebXR)"],
            ["@muix/policy", "PolicyEngine, PermissionPolicy, ConcurrencyPolicy, RateLimitPolicy"],
            ["@muix/text", "TextChannel, streaming token accumulator"],
            ["@muix/agent", "AgentChannel, SSE/NDJSON parser, ToolRegistry"],
            ["@muix/audio", "AudioChannel, MicrophoneSource, AudioWorkletSink, VAD"],
            ["@muix/video", "VideoChannel, CameraSource, CanvasSink"],
            ["@muix/motion", "MotionChannel, PointerSource, DeviceOrientationSource, GestureRecognizer"],
            ["@muix/react", "SessionProvider, useSignal, useChannel, useAction, useAgent"],
            ["@muix/vue", "provideSession, useSignal, useChannel, useAction, useAgent"],
            ["@muix/solid", "createSessionProvider, useSignal, useChannel, useAction, useAgent"],
            ["@muix/wc", "<muix-session>, <muix-channel> custom elements"],
            ["@muix/devtools", "SessionInspector, ChannelTracer, <muix-devtools> panel"],
          ].map(([pkg, desc]) => (
            <tr key={pkg}>
              <td><code>{pkg}</code></td>
              <td style={{ color: "var(--muted)", fontSize: "0.875rem" }}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr />

      <h2 style={{ borderBottom: "none", marginTop: "2rem" }}>Design principles</h2>
      <ul style={{ marginTop: "1rem", lineHeight: 2 }}>
        <li><strong>Browser-native</strong> — WHATWG Streams, Web Audio API, Pointer Events; no polyfills required.</li>
        <li><strong>Streaming-first</strong> — every modality is a <code>Channel</code> with backpressure and <code>pause()</code>/<code>resume()</code>.</li>
        <li><strong>Framework-agnostic</strong> — <code>@muix/core</code> has zero framework deps; adapters are thin layers.</li>
        <li><strong>Pure ESM</strong> — <code>&quot;type&quot;: &quot;module&quot;</code>, <code>&quot;sideEffects&quot;: false</code> on every package; tree-shakeable.</li>
        <li><strong>TC39-aligned</strong> — Signal naming matches the TC39 proposal; Observable has <code>[Symbol.observable]()</code> for RxJS interop.</li>
      </ul>
    </main>
  );
}
