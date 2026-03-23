import type { Metadata } from "next";

export const metadata: Metadata = { title: "@muix/capability" };

export default function CapabilityPage() {
  return (
    <>
      <h1>@muix/capability</h1>
      <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
        Browser feature detection with graceful degradation and fallback chains.
      </p>

      <h2>Core concepts</h2>
      <ul>
        <li><strong>probe()</strong> — detect availability without requesting permissions.</li>
        <li><strong>acquire()</strong> — obtain the native handle (may prompt the user).</li>
        <li><strong>negotiate()</strong> — try a capability then its fallbacks; return the first available.</li>
      </ul>

      <h2>CapabilityRegistry</h2>
      <pre>{`import { createCapabilityRegistry, microphoneCapability } from "@muix/capability";

const registry = createCapabilityRegistry();
registry.register(microphoneCapability);

const status = await registry.probe("media:microphone");
// "available" | "unavailable" | "degraded" | "denied" | "unknown"

const { descriptor, status: s } = await registry.negotiate("media:microphone");
const stream = await descriptor.acquire();   // MediaStream
await descriptor.release(stream);`}</pre>

      <h2>Built-in probes</h2>
      <table>
        <thead><tr><th>ID</th><th>Export</th><th>Returns</th></tr></thead>
        <tbody>
          <tr><td><code>media:microphone</code></td><td><code>microphoneCapability</code></td><td><code>MediaStream</code></td></tr>
          <tr><td><code>media:camera</code></td><td><code>cameraCapability</code></td><td><code>MediaStream</code></td></tr>
          <tr><td><code>media:screen</code></td><td><code>screenCaptureCapability</code></td><td><code>MediaStream</code></td></tr>
          <tr><td><code>speech:synthesis</code></td><td><code>speechSynthesisCapability</code></td><td><code>SpeechSynthesis</code></td></tr>
          <tr><td><code>speech:recognition</code></td><td><code>speechRecognitionCapability</code></td><td>recognition instance</td></tr>
          <tr><td><code>webrtc</code></td><td><code>webRTCCapability</code></td><td><code>RTCPeerConnection</code></td></tr>
          <tr><td><code>xr:immersive-vr</code></td><td><code>immersiveVrCapability</code></td><td>XR session handle</td></tr>
          <tr><td><code>xr:immersive-ar</code></td><td><code>immersiveArCapability</code></td><td>XR session handle</td></tr>
          <tr><td><code>xr:inline</code></td><td><code>inlineXrCapability</code></td><td>XR session handle</td></tr>
        </tbody>
      </table>

      <h2>Custom capability</h2>
      <pre>{`import type { CapabilityDescriptor } from "@muix/capability";

const bluetoothCapability: CapabilityDescriptor<BluetoothDevice> = {
  id: "bluetooth",
  description: "Web Bluetooth API",
  probe: async () =>
    "bluetooth" in navigator ? "available" : "unavailable",
  acquire: () =>
    navigator.bluetooth.requestDevice({ acceptAllDevices: true }),
  release: async () => {},
  fallbacks: [],
};

registry.register(bluetoothCapability);`}</pre>
    </>
  );
}
