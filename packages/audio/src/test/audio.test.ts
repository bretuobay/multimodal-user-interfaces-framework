import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioChannel } from '../audio-channel.js';
import { computeRms, createVad } from '../vad.js';

describe('AudioChannel', () => {
  it('constructs with defaults', () => {
    const ch = new AudioChannel();
    expect(ch.sampleRate).toBe(48000);
    expect(ch.channelCount).toBe(1);
    expect(ch.status.value).toBe('idle');
  });

  it('accepts custom options', () => {
    const ch = new AudioChannel({ sampleRate: 16000, channelCount: 2, id: 'mic' });
    expect(ch.sampleRate).toBe(16000);
    expect(ch.channelCount).toBe(2);
    expect(ch.id).toBe('mic');
  });

  it('can open and send a frame', async () => {
    const ch = new AudioChannel();
    await ch.open();
    expect(ch.status.value).toBe('open');

    const received: Float32Array[] = [];
    ch.observe().subscribe({ next: (f) => received.push(f.data.buffer) });

    const buf = new Float32Array([0.1, 0.2, 0.3]);
    await ch.sendFrame({ buffer: buf, sampleRate: 48000, channelCount: 1, timestamp: 0 });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(buf);
  });

  it('closes cleanly', async () => {
    const ch = new AudioChannel();
    await ch.open();
    await ch.close();
    expect(ch.status.value).toBe('closed');
  });
});

describe('computeRms', () => {
  it('returns 0 for silent buffer', () => {
    expect(computeRms(new Float32Array(128))).toBe(0);
  });

  it('returns 1 for full-scale buffer', () => {
    const buf = new Float32Array(128).fill(1.0);
    expect(computeRms(buf)).toBeCloseTo(1.0);
  });

  it('returns ~0.707 for sine-wave-like rms', () => {
    const buf = new Float32Array(128);
    for (let i = 0; i < buf.length; i++) {
      buf[i] = Math.sin((2 * Math.PI * i) / 128);
    }
    expect(computeRms(buf)).toBeCloseTo(Math.SQRT1_2, 1);
  });
});

describe('createVad', () => {
  it('marks frames above threshold as speech', async () => {
    const ch = new AudioChannel();
    await ch.open();

    const results: Array<{ isSpeech: boolean; rms: number }> = [];
    createVad(ch.observe()).subscribe({ next: (r) => results.push(r.vad) });

    const loudBuf = new Float32Array(128).fill(0.5);
    await ch.sendFrame({ buffer: loudBuf, sampleRate: 48000, channelCount: 1, timestamp: 0 });

    expect(results[0].isSpeech).toBe(true);
    expect(results[0].rms).toBeCloseTo(0.5);
  });

  it('marks silent frames after pad as non-speech', async () => {
    const ch = new AudioChannel();
    await ch.open();

    const results: Array<{ isSpeech: boolean }> = [];
    createVad(ch.observe(), { threshold: 0.01, silencePadFrames: 2 }).subscribe({
      next: (r) => results.push(r.vad),
    });

    // Send one loud frame → speech
    const loud = new Float32Array(4).fill(0.5);
    await ch.sendFrame({ buffer: loud, sampleRate: 48000, channelCount: 1, timestamp: 0 });

    // Send 2 silent frames → should flip to silence
    const silent = new Float32Array(4).fill(0);
    await ch.sendFrame({ buffer: silent, sampleRate: 48000, channelCount: 1, timestamp: 1 });
    await ch.sendFrame({ buffer: silent, sampleRate: 48000, channelCount: 1, timestamp: 2 });

    expect(results[0].isSpeech).toBe(true);
    expect(results[2].isSpeech).toBe(false);
  });

  it('uses custom threshold', async () => {
    const ch = new AudioChannel();
    await ch.open();

    const results: Array<{ isSpeech: boolean }> = [];
    // Very high threshold — 0.5 amplitude buffer should NOT be speech
    createVad(ch.observe(), { threshold: 0.9 }).subscribe({
      next: (r) => results.push(r.vad),
    });

    const buf = new Float32Array(4).fill(0.5);
    await ch.sendFrame({ buffer: buf, sampleRate: 48000, channelCount: 1, timestamp: 0 });

    expect(results[0].isSpeech).toBe(false);
  });
});
