import type { Metadata } from "next";

export const metadata: Metadata = { title: "@muix/video" };

export default function VideoPage() {
  return (
    <>
      <h1>@muix/video</h1>
      <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
        Camera capture and canvas rendering via RGBA frame streaming.
      </p>

      <h2>VideoChannel</h2>
      <pre>{`import { createVideoChannel } from "@muix/video";

const ch = createVideoChannel({ width: 1280, height: 720, frameRate: 30 });
await ch.open();`}</pre>

      <h2>MuixVideoFrame</h2>
      <p>
        Named <code>MuixVideoFrame</code> to avoid collision with the native{" "}
        <code>VideoFrame</code> Web API.
      </p>
      <pre>{`interface MuixVideoFrame {
  data: Uint8ClampedArray;   // raw RGBA pixels
  width: number;
  height: number;
  timestamp: number;         // performance.now()
}`}</pre>

      <h2>CameraSource</h2>
      <p>
        Acquires the device camera via <code>getUserMedia</code>, draws each
        frame onto an offscreen canvas, and sends the pixel data into a{" "}
        <code>VideoChannel</code> using <code>requestAnimationFrame</code>.
      </p>
      <pre>{`import { CameraSource, createVideoChannel } from "@muix/video";

const channel = createVideoChannel({ frameRate: 30 });
const camera = new CameraSource({ facingMode: "user" });

await channel.open();
await camera.start(channel);

// ... later
await camera.stop();`}</pre>

      <h2>CanvasSink</h2>
      <p>Renders frames from a channel onto an <code>HTMLCanvasElement</code>.</p>
      <pre>{`import { CanvasSink } from "@muix/video";

const sink = new CanvasSink({ autoClear: true });
const canvas = document.querySelector("canvas")!;

sink.attach(canvas, channel);   // starts consuming frames immediately

sink.detach();                  // stop rendering`}</pre>

      <h2>Example — camera preview</h2>
      <pre>{`"use client";
import { useEffect, useRef } from "react";
import { createVideoChannel, CameraSource, CanvasSink } from "@muix/video";

export function CameraPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const channel = createVideoChannel({ frameRate: 30 });
    const camera = new CameraSource();
    const sink = new CanvasSink();

    channel.open()
      .then(() => camera.start(channel))
      .then(() => sink.attach(canvasRef.current!, channel));

    return () => { camera.stop(); sink.detach(); channel.close(); };
  }, []);

  return <canvas ref={canvasRef} />;
}`}</pre>
    </>
  );
}
