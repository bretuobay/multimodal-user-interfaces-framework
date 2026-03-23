import { describe, it, expect } from 'vitest';
import { createTextChannel, accumulateText } from '../text-channel.js';

describe('TextChannel', () => {
  it('opens and sends a token', async () => {
    const ch = createTextChannel({ id: 'test-text' });
    await ch.open();
    expect(ch.status.value).toBe('open');

    const frames: string[] = [];
    const reader = ch.source.readable.getReader();

    await ch.sendToken('Hello', false);

    const { value } = await reader.read();
    expect(value?.data.text).toBe('Hello');
    expect(value?.data.final).toBe(false);
    reader.cancel();
  });

  it('collects multiple tokens', async () => {
    const ch = createTextChannel();
    await ch.open();

    const tokens = ['The ', 'quick ', 'brown fox'];
    const collected: string[] = [];

    // Start reading
    const readAll = (async () => {
      const reader = ch.source.readable.getReader();
      for (let i = 0; i < tokens.length; i++) {
        const { value } = await reader.read();
        if (value) collected.push(value.data.text);
      }
      reader.cancel();
    })();

    // Send tokens
    for (const t of tokens) {
      await ch.sendToken(t);
    }

    await readAll;
    expect(collected).toEqual(tokens);
  });

  it('accumulateText assembles full string', async () => {
    const ch = createTextChannel();
    await ch.open();

    const reader = ch.source.readable.getReader();

    // Write tokens
    await ch.sendToken('Hello', false);
    await ch.sendToken(' World', true);

    // Read frames async
    async function* readFrames() {
      while (true) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        yield value;
        if (value.data.final) break;
      }
    }

    const result = await accumulateText(readFrames());
    expect(result).toBe('Hello World');
    reader.cancel();
  });

  it('pauses and resumes', async () => {
    const ch = createTextChannel();
    await ch.open();
    ch.pause();
    expect(ch.status.value).toBe('paused');
    ch.resume();
    expect(ch.status.value).toBe('open');
  });

  it('closes cleanly', async () => {
    const ch = createTextChannel();
    await ch.open();
    await ch.close();
    expect(ch.status.value).toBe('closed');
  });
});
