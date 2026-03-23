import { describe, it, expect } from 'vitest';
import { parseSSEStream, parseNDJSONStream } from '../sse-parser.js';
import type { AgentStreamFrame } from '../types.js';

function makeSSEStream(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line + '\n'));
      }
      controller.close();
    },
  });
}

function makeNDJSONStream(objects: unknown[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const obj of objects) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      }
      controller.close();
    },
  });
}

async function collect(
  gen: AsyncGenerator<AgentStreamFrame>,
): Promise<AgentStreamFrame[]> {
  const frames: AgentStreamFrame[] = [];
  for await (const f of gen) {
    frames.push(f);
  }
  return frames;
}

describe('parseSSEStream', () => {
  it('parses text delta frames', async () => {
    const stream = makeSSEStream([
      'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}',
      'data: {"choices":[{"delta":{"content":" World"},"finish_reason":null}]}',
      'data: [DONE]',
    ]);

    const frames = await collect(parseSSEStream(stream));
    const deltas = frames.filter((f) => f.type === 'delta');
    expect(deltas).toHaveLength(2);
    expect(deltas[0]?.content).toBe('Hello');
    expect(deltas[1]?.content).toBe(' World');

    const done = frames.find((f) => f.type === 'done');
    expect(done?.finishReason).toBe('stop');
  });

  it('emits done frame on [DONE]', async () => {
    const stream = makeSSEStream(['data: [DONE]']);
    const frames = await collect(parseSSEStream(stream));
    expect(frames[0]?.type).toBe('done');
  });

  it('skips empty lines and comments', async () => {
    const stream = makeSSEStream([
      ': this is a comment',
      '',
      'data: {"choices":[{"delta":{"content":"ok"},"finish_reason":null}]}',
      'data: [DONE]',
    ]);
    const frames = await collect(parseSSEStream(stream));
    const deltas = frames.filter((f) => f.type === 'delta');
    expect(deltas).toHaveLength(1);
    expect(deltas[0]?.content).toBe('ok');
  });

  it('parses tool_call frames', async () => {
    const stream = makeSSEStream([
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"tc1","function":{"name":"get_weather","arguments":"{\\"city\\":"}}]},"finish_reason":null}]}',
      'data: [DONE]',
    ]);
    const frames = await collect(parseSSEStream(stream));
    const toolCall = frames.find((f) => f.type === 'tool_call');
    expect(toolCall?.toolCall?.name).toBe('get_weather');
    expect(toolCall?.toolCall?.id).toBe('tc1');
  });

  it('parses error frames', async () => {
    const stream = makeSSEStream([
      'data: {"error":{"message":"rate limit","type":"rate_limit_error"}}',
    ]);
    const frames = await collect(parseSSEStream(stream));
    const error = frames.find((f) => f.type === 'error');
    expect(error).toBeDefined();
  });

  it('stops on abort signal', async () => {
    const controller = new AbortController();
    const stream = makeSSEStream([
      'data: {"choices":[{"delta":{"content":"A"},"finish_reason":null}]}',
      'data: [DONE]',
    ]);
    controller.abort();
    const frames = await collect(parseSSEStream(stream, controller.signal));
    const done = frames.find((f) => f.type === 'done');
    expect(done?.finishReason).toBe('cancelled');
  });
});

describe('parseNDJSONStream', () => {
  it('parses delta and done frames', async () => {
    const stream = makeNDJSONStream([
      { type: 'delta', content: 'hello' },
      { type: 'delta', content: ' world' },
      { type: 'done', finishReason: 'stop' },
    ]);
    const frames = await collect(parseNDJSONStream(stream));
    expect(frames.filter((f) => f.type === 'delta')).toHaveLength(2);
    expect(frames.find((f) => f.type === 'done')).toBeDefined();
  });

  it('stops on error frame', async () => {
    const stream = makeNDJSONStream([
      { type: 'delta', content: 'before' },
      { type: 'error', error: 'oops' },
      { type: 'delta', content: 'after' }, // should not appear
    ]);
    const frames = await collect(parseNDJSONStream(stream));
    expect(frames.some((f) => f.type === 'error')).toBe(true);
    expect(frames.filter((f) => f.type === 'delta')).toHaveLength(1);
  });
});
