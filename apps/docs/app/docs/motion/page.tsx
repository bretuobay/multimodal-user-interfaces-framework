import type { Metadata } from "next";

export const metadata: Metadata = { title: "@muix/motion" };

export default function MotionPage() {
  return (
    <>
      <h1>@muix/motion</h1>
      <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
        Pointer events, device orientation, and gesture recognition (tap, swipe, pinch).
      </p>

      <h2>MotionEvent types</h2>
      <p>All events share a discriminated union on <code>type</code>:</p>
      <table>
        <thead><tr><th>type</th><th>Fields</th></tr></thead>
        <tbody>
          <tr><td><code>pointer</code></td><td><code>kind</code> (down|move|up|cancel), <code>x</code>, <code>y</code>, <code>pressure</code>, <code>pointerType</code></td></tr>
          <tr><td><code>orientation</code></td><td><code>alpha</code>, <code>beta</code>, <code>gamma</code> (device tilt angles)</td></tr>
          <tr><td><code>gesture</code></td><td><code>kind</code> (tap|swipe|pinch) + kind-specific fields</td></tr>
        </tbody>
      </table>

      <h2>PointerSource</h2>
      <p>Listens to Pointer Events on a DOM target and emits them into a channel.</p>
      <pre>{`import { createMotionChannel, PointerSource } from "@muix/motion";

const channel = createMotionChannel();
const pointer = new PointerSource();

await channel.open();
pointer.attach(document.getElementById("canvas")!, channel);

// Observe raw events
channel.observe().subscribe({
  next: ({ data }) => {
    if (data.type === "pointer" && data.kind === "down") {
      console.log(data.x, data.y);
    }
  },
});

pointer.detach();`}</pre>

      <h2>DeviceOrientationSource</h2>
      <pre>{`import { DeviceOrientationSource } from "@muix/motion";

const orientation = new DeviceOrientationSource();
orientation.attach(channel);   // listens to window deviceorientation
orientation.detach();`}</pre>

      <h2>GestureRecognizer</h2>
      <p>
        A <code>TransformStream&lt;MotionEvent, MotionEvent&gt;</code> that
        passes raw events through and injects synthesised gesture events. Use{" "}
        <code>Channel.pipe()</code> to layer it on top of a{" "}
        <code>MotionChannel</code>.
      </p>
      <pre>{`import { createGestureRecognizer } from "@muix/motion";

const recognizer = createGestureRecognizer({
  tapMaxDurationMs: 200,    // max ms for a tap
  tapMaxMovementPx: 10,     // max px movement for a tap
  swipeMinDistancePx: 50,   // min px for a swipe
});

const enriched = channel.pipe(recognizer);

enriched.observe().subscribe({
  next: ({ data }) => {
    if (data.type === "gesture") {
      switch (data.kind) {
        case "tap":   console.log("tap at", data.x, data.y); break;
        case "swipe": console.log("swipe", data.direction, data.velocityPxMs, "px/ms"); break;
        case "pinch": console.log("pinch scale", data.scale); break;
      }
    }
  },
});`}</pre>
    </>
  );
}
