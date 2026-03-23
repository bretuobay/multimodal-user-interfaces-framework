import { describe, it, expect } from 'vitest';
import { MotionChannel } from '../motion-channel.js';
import { createGestureRecognizer } from '../gesture-recognizer.js';
import type { MotionEvent, PointerEventData } from '../types.js';

function ptr(
  kind: PointerEventData['kind'],
  x: number,
  y: number,
  timestamp: number,
  pointerId = 1,
): PointerEventData {
  return {
    type: 'pointer',
    kind,
    pointerId,
    x,
    y,
    pressure: kind === 'down' ? 0.5 : 0,
    pointerType: 'touch',
    timestamp,
  };
}

async function runThrough(events: MotionEvent[]): Promise<MotionEvent[]> {
  const recognizer = createGestureRecognizer();
  const results: MotionEvent[] = [];

  const writeAll = async () => {
    const writer = recognizer.writable.getWriter();
    for (const e of events) {
      await writer.write(e);
    }
    await writer.close();
  };

  const readAll = async () => {
    const reader = recognizer.readable.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) results.push(value);
    }
  };

  await Promise.all([writeAll(), readAll()]);
  return results;
}

describe('MotionChannel', () => {
  it('constructs and emits events', async () => {
    const ch = new MotionChannel();
    await ch.open();
    expect(ch.status.value).toBe('open');

    const received: MotionEvent[] = [];
    ch.observe().subscribe({ next: (f) => received.push(f.data) });

    await ch.emit({ type: 'orientation', alpha: 45, beta: 10, gamma: -5, timestamp: 0 });
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('orientation');
  });
});

describe('GestureRecognizer', () => {
  it('passes through raw pointer events', async () => {
    const events = [ptr('down', 10, 10, 0), ptr('up', 11, 11, 100)];
    const results = await runThrough(events);
    const rawPointers = results.filter((e) => e.type === 'pointer');
    expect(rawPointers).toHaveLength(2);
  });

  it('detects tap', async () => {
    const events = [ptr('down', 10, 10, 0), ptr('up', 10, 10, 100)];
    const results = await runThrough(events);
    const taps = results.filter((e) => e.type === 'gesture' && e.kind === 'tap');
    expect(taps).toHaveLength(1);
    expect((taps[0] as { x: number }).x).toBe(10);
  });

  it('does not detect tap if duration too long', async () => {
    const events = [ptr('down', 10, 10, 0), ptr('up', 10, 10, 500)];
    const results = await runThrough(events);
    const taps = results.filter((e) => e.type === 'gesture' && e.kind === 'tap');
    expect(taps).toHaveLength(0);
  });

  it('detects swipe right', async () => {
    const events = [
      ptr('down', 0, 0, 0),
      ptr('move', 30, 0, 50),
      ptr('up', 100, 2, 100),
    ];
    const results = await runThrough(events);
    const swipes = results.filter((e) => e.type === 'gesture' && e.kind === 'swipe');
    expect(swipes).toHaveLength(1);
    expect((swipes[0] as { direction: string }).direction).toBe('right');
  });

  it('detects swipe up', async () => {
    const events = [
      ptr('down', 50, 100, 0),
      ptr('move', 52, 50, 50),
      ptr('up', 52, 10, 100),
    ];
    const results = await runThrough(events);
    const swipes = results.filter((e) => e.type === 'gesture' && e.kind === 'swipe');
    expect(swipes).toHaveLength(1);
    expect((swipes[0] as { direction: string }).direction).toBe('up');
  });

  it('does not synthesise gesture from cancelled pointer', async () => {
    const events = [ptr('down', 0, 0, 0), ptr('cancel', 100, 0, 100)];
    const results = await runThrough(events);
    const gestures = results.filter((e) => e.type === 'gesture');
    expect(gestures).toHaveLength(0);
  });

  it('passes through orientation events unchanged', async () => {
    const oriEvent: MotionEvent = {
      type: 'orientation',
      alpha: 90,
      beta: 0,
      gamma: 0,
      timestamp: 0,
    };
    const results = await runThrough([oriEvent]);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(oriEvent);
  });
});
