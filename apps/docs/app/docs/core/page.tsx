import type { Metadata } from "next";
import { CodeBlock } from "@repo/ui";

export const metadata: Metadata = { title: "@muix/core" };

export default async function CorePage() {
  return (
    <>
      <h1>@muix/core</h1>
      <p className="docs-lede">
        The foundation — Signal, Observable, Channel, Session, Action, EventBus.
        Zero runtime dependencies.
      </p>

      <h2>Signal</h2>
      <p>
        A reactive value container. Naming is TC39 Signals proposal-compatible;
        the implementation is a lightweight own build (~150 lines).
      </p>
      <CodeBlock
        code={`import { createSignal, createComputed } from "@muix/core";

const count = createSignal(0);
count.set(1);
count.update((n) => n + 1);   // → 2
count.peek();                  // read without subscribing

const doubled = createComputed(
  () => count.value * 2,
  [count],
);

const sub = count.observe().subscribe({ next: (v) => console.log(v) });
sub.unsubscribe();`}
        language="ts"
        title="signal.ts"
      />
      <table>
        <thead><tr><th>Member</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>value</code></td><td>Current value (tracked read)</td></tr>
          <tr><td><code>peek()</code></td><td>Read without creating a subscription side-effect</td></tr>
          <tr><td><code>set(v)</code></td><td>Set new value; notifies listeners only if <code>!equals(prev, next)</code></td></tr>
          <tr><td><code>update(fn)</code></td><td>Derive next value from current</td></tr>
          <tr><td><code>observe()</code></td><td>Returns an <code>Observable&lt;T&gt;</code>; emits current value immediately on subscribe</td></tr>
        </tbody>
      </table>

      <h2>Observable</h2>
      <p>
        TC39-compatible push stream (~200 lines). Implements{" "}
        <code>[Symbol.observable]()</code> for RxJS interop.
      </p>
      <CodeBlock
        code={`import { Observable } from "@muix/core";

const obs = new Observable<number>((observer) => {
  observer.next(1);
  observer.next(2);
  observer.complete();
  return () => { /* cleanup */ };
});

const sub = obs.subscribe({
  next: (v) => console.log(v),
  error: (e) => console.error(e),
  complete: () => console.log("done"),
});

sub.unsubscribe();`}
        language="ts"
        title="observable.ts"
      />

      <h2>Channel</h2>
      <p>
        Duplex streaming primitive built on{" "}
        <code>ReadableStream</code> / <code>WritableStream</code> (WHATWG Streams).
        Provides native backpressure, pause/resume, and composable piping.
      </p>
      <CodeBlock
        code={`import { createChannel } from "@muix/core";

const ch = createChannel<string>({ highWaterMark: 16 });
await ch.open();

// Write
await ch.send("hello");

// Observe (non-locking)
ch.observe().subscribe({ next: (frame) => console.log(frame.data) });

// Pipe through a TransformStream
const upper = ch.pipe(new TransformStream({
  transform: (chunk, ctrl) => ctrl.enqueue(chunk.toUpperCase()),
}));

ch.pause();   // backpressure
ch.resume();
await ch.close();`}
        language="ts"
        title="channel.ts"
      />
      <table>
        <thead><tr><th>Member</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>status</code></td><td><code>ReadonlySignal&lt;ChannelStatus&gt;</code> — <code>idle | open | paused | closed | errored</code></td></tr>
          <tr><td><code>source.readable</code></td><td>WHATWG <code>ReadableStream&lt;ChannelFrame&lt;Out&gt;&gt;</code></td></tr>
          <tr><td><code>sink.writable</code></td><td>WHATWG <code>WritableStream&lt;ChannelFrame&lt;In&gt;&gt;</code></td></tr>
          <tr><td><code>send(data)</code></td><td>Enqueue a frame; awaits if paused</td></tr>
          <tr><td><code>observe()</code></td><td>Non-locking Observable over outbound frames</td></tr>
          <tr><td><code>pipe(transform)</code></td><td>Returns a new downstream Channel</td></tr>
        </tbody>
      </table>

      <h2>Session</h2>
      <p>
        A lifecycle container that owns channels and dispatches actions.
      </p>
      <CodeBlock
        code={`import { createSession } from "@muix/core";

const session = createSession({ id: "chat" });
await session.start();

const ch = session.addChannel<string>("messages");
await ch.open();

const action = session.dispatch({
  id: "fetch-summary",
  execute: async function* (signal) {
    yield { type: "progress", percent: 50 };
    return "done";
  },
});

await session.suspend();
await session.resume();
await session.terminate();`}
        language="ts"
        title="session.ts"
      />

      <h2>Action</h2>
      <p>
        Cancellable async unit of work. Uses <code>AbortSignal</code> for
        cancellation. Named <code>toPromise()</code> (not <code>.then()</code>)
        to avoid the JavaScript thenable trap.
      </p>
      <CodeBlock
        code={`const action = session.dispatch({
  id: "my-action",
  execute: async function* (signal) {
    for (let i = 0; i < 10; i++) {
      if (signal.aborted) return;
      yield { type: "progress", percent: i * 10 };
    }
    return "result";
  },
});

// Reactive status
action.status.observe().subscribe({ next: console.log });

action.cancel("user cancelled");
const result = await action.toPromise();`}
        language="ts"
        title="action.ts"
      />
    </>
  );
}
