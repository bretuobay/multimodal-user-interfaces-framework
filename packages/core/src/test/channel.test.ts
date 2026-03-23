import { describe, it, expect } from 'vitest';
import { createChannel, createFrame } from '../channel.js';

describe('Channel', () => {
  it('forwards sink writes to observers and source readers', async () => {
    const channel = createChannel<string>();
    const observed: string[] = [];

    channel.observe().subscribe({
      next: (frame) => observed.push(frame.data),
    });

    const writer = channel.sink.writable.getWriter();
    await writer.write(createFrame('hello'));
    writer.releaseLock();

    const reader = channel.source.readable.getReader();
    const { value } = await reader.read();
    reader.releaseLock();

    expect(observed).toEqual(['hello']);
    expect(value?.data).toBe('hello');
  });

  it('supports multiple observers without reader lock conflicts', async () => {
    const channel = createChannel<string>();
    const first: string[] = [];
    const second: string[] = [];

    channel.observe().subscribe({
      next: (frame) => first.push(frame.data),
    });
    channel.observe().subscribe({
      next: (frame) => second.push(frame.data),
    });

    await channel.send('frame');

    expect(first).toEqual(['frame']);
    expect(second).toEqual(['frame']);
  });

  it('supports multiple pipe() calls without locking the source stream', async () => {
    const channel = createChannel<string>();
    const upper = channel.pipe(new TransformStream<string, string>({
      transform(chunk, controller) {
        controller.enqueue(chunk.toUpperCase());
      },
    }));
    const wrapped = channel.pipe(new TransformStream<string, string>({
      transform(chunk, controller) {
        controller.enqueue(`[${chunk}]`);
      },
    }));

    const upperFrames: string[] = [];
    const wrappedFrames: string[] = [];

    upper.observe().subscribe({
      next: (frame) => upperFrames.push(frame.data),
    });
    wrapped.observe().subscribe({
      next: (frame) => wrappedFrames.push(frame.data),
    });

    await channel.send('muix');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(upperFrames).toEqual(['MUIX']);
    expect(wrappedFrames).toEqual(['[muix]']);
  });
});
