import { describe, it, expect } from 'vitest';
import { VideoChannel, createVideoChannel } from '../video-channel.js';
import type { MuixVideoFrame } from '../types.js';

function makeFrame(w = 4, h = 4): MuixVideoFrame {
  return {
    data: new Uint8ClampedArray(w * h * 4).fill(128),
    width: w,
    height: h,
    timestamp: performance.now(),
  };
}

describe('VideoChannel', () => {
  it('constructs with defaults', () => {
    const ch = new VideoChannel();
    expect(ch.width).toBe(640);
    expect(ch.height).toBe(480);
    expect(ch.frameRate).toBe(30);
    expect(ch.status.value).toBe('idle');
  });

  it('accepts custom options', () => {
    const ch = createVideoChannel({ width: 1280, height: 720, frameRate: 60, id: 'cam' });
    expect(ch.width).toBe(1280);
    expect(ch.height).toBe(720);
    expect(ch.frameRate).toBe(60);
    expect(ch.id).toBe('cam');
  });

  it('can open and send a frame', async () => {
    const ch = new VideoChannel();
    await ch.open();
    expect(ch.status.value).toBe('open');

    const received: MuixVideoFrame[] = [];
    ch.observe().subscribe({ next: (f) => received.push(f.data) });

    const frame = makeFrame();
    await ch.sendFrame(frame);

    expect(received).toHaveLength(1);
    expect(received[0].width).toBe(4);
    expect(received[0].height).toBe(4);
    expect(received[0].data).toEqual(frame.data);
  });

  it('rejects sends on closed channel', async () => {
    const ch = new VideoChannel();
    await ch.open();
    await ch.close();

    await expect(ch.sendFrame(makeFrame())).rejects.toThrow(/closed/);
  });

  it('can pause and resume', async () => {
    const ch = new VideoChannel();
    await ch.open();
    ch.pause();
    expect(ch.status.value).toBe('paused');
    ch.resume();
    expect(ch.status.value).toBe('open');
  });
});
