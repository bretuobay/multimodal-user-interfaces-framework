import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSession } from '@muix/core';
import { SessionInspector } from '../session-inspector.js';
import { ChannelTracer } from '../channel-tracer.js';

describe('ChannelTracer', () => {
  it('tracks frame count', async () => {
    const session = createSession();
    await session.start();
    const channel = session.addChannel('trace-test');
    await channel.open();

    const tracer = new ChannelTracer(channel as import('@muix/core').Channel<unknown, unknown>);

    await channel.send('frame1');
    await channel.send('frame2');
    await channel.send('frame3');

    expect(tracer.snapshot.frameCount).toBe(3);
    expect(tracer.snapshot.id).toBe('trace-test');

    tracer.dispose();
    await session.terminate();
  });

  it('tracks lastFrameAt', async () => {
    const session = createSession();
    await session.start();
    const channel = session.addChannel('time-test');
    await channel.open();

    const tracer = new ChannelTracer(channel as import('@muix/core').Channel<unknown, unknown>);
    const before = Date.now();
    await channel.send('x');

    expect(tracer.snapshot.lastFrameAt).not.toBeNull();
    expect(tracer.snapshot.lastFrameAt!).toBeGreaterThanOrEqual(before);

    tracer.dispose();
    await session.terminate();
  });

  it('disposes cleanly and stops counting', async () => {
    const session = createSession();
    await session.start();
    const channel = session.addChannel('dispose-test');
    await channel.open();

    const tracer = new ChannelTracer(channel as import('@muix/core').Channel<unknown, unknown>);

    await channel.send('before-dispose');
    expect(tracer.snapshot.frameCount).toBe(1);

    tracer.dispose();

    // After dispose the frameCount is frozen at 1
    expect(tracer.snapshot.frameCount).toBe(1);

    await session.terminate();
  });
});

describe('SessionInspector', () => {
  let session: ReturnType<typeof createSession>;

  beforeEach(async () => {
    session = createSession();
    await session.start();
  });

  afterEach(async () => {
    await session.terminate().catch(() => {});
  });

  it('captures session id and status', () => {
    const inspector = new SessionInspector(session);
    const snap = inspector.snapshot();

    expect(snap.id).toBe(session.id);
    expect(snap.status).toBe('active');
    inspector.dispose();
  });

  it('calls onChange handlers on interval', async () => {
    vi.useFakeTimers();
    const inspector = new SessionInspector(session, { updateIntervalMs: 100 });
    inspector.start();

    const snapshots: string[] = [];
    inspector.onChange((s) => snapshots.push(s.status));

    vi.advanceTimersByTime(350);
    expect(snapshots.length).toBeGreaterThanOrEqual(3);

    inspector.dispose();
    vi.useRealTimers();
  });

  it('unsubscribes onChange handler', () => {
    vi.useFakeTimers();
    const inspector = new SessionInspector(session, { updateIntervalMs: 100 });
    inspector.start();

    let count = 0;
    const unsub = inspector.onChange(() => count++);
    vi.advanceTimersByTime(200);
    unsub();
    const countAfterUnsub = count;
    vi.advanceTimersByTime(300);

    expect(count).toBe(countAfterUnsub);

    inspector.dispose();
    vi.useRealTimers();
  });

  it('disposes and stops polling', () => {
    vi.useFakeTimers();
    const inspector = new SessionInspector(session, { updateIntervalMs: 100 });
    inspector.start();

    let count = 0;
    inspector.onChange(() => count++);
    vi.advanceTimersByTime(200);
    inspector.dispose();
    const countAfterDispose = count;
    vi.advanceTimersByTime(500);

    expect(count).toBe(countAfterDispose);
    vi.useRealTimers();
  });
});
