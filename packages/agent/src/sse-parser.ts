/**
 * SSE / NDJSON streaming response parser.
 * Converts a fetch ReadableStream<Uint8Array> into AsyncIterable<AgentStreamFrame>.
 */

import type { AgentStreamFrame } from './types.js';

/**
 * Parse a Server-Sent Events stream into AgentStreamFrame objects.
 * Expects the OpenAI-compatible SSE format:
 *   data: {"choices":[{"delta":{"content":"token"},"finish_reason":null}]}
 *   data: [DONE]
 */
export async function* parseSSEStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<AgentStreamFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        yield { type: 'done', finishReason: 'cancelled' };
        return;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // last (potentially incomplete) line stays in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue; // empty or comment

        if (trimmed === 'data: [DONE]') {
          yield { type: 'done', finishReason: 'stop' };
          return;
        }

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr) as OpenAIStreamChunk;
            const frame = parseOpenAIChunk(parsed);
            if (frame) yield frame;
          } catch {
            // Malformed JSON — emit as raw delta
            yield { type: 'delta', content: jsonStr };
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: 'done', finishReason: 'stop' };
}

/**
 * Parse a newline-delimited JSON (NDJSON) stream.
 * Each line is a complete JSON object representing an AgentStreamFrame.
 */
export async function* parseNDJSONStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<AgentStreamFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        yield { type: 'done', finishReason: 'cancelled' };
        return;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const frame = JSON.parse(trimmed) as AgentStreamFrame;
          yield frame;
          if (frame.type === 'done' || frame.type === 'error') return;
        } catch {
          // Skip malformed lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: 'done', finishReason: 'stop' };
}

// ---- OpenAI-compatible chunk types ----

interface OpenAIDelta {
  content?: string;
  role?: string;
  tool_calls?: Array<{
    index: number;
    id?: string;
    function?: { name?: string; arguments?: string };
  }>;
}

interface OpenAIChoice {
  delta?: OpenAIDelta;
  finish_reason?: string | null;
}

interface OpenAIStreamChunk {
  choices?: OpenAIChoice[];
  error?: { message: string; type: string };
}

function parseOpenAIChunk(
  chunk: OpenAIStreamChunk,
): AgentStreamFrame | null {
  if (chunk.error) {
    return { type: 'error', error: chunk.error };
  }

  const choice = chunk.choices?.[0];
  if (!choice) return null;

  if (choice.finish_reason && choice.finish_reason !== 'null') {
    return {
      type: 'done',
      finishReason:
        choice.finish_reason === 'tool_calls'
          ? 'tool_use'
          : choice.finish_reason === 'stop'
            ? 'stop'
            : 'stop',
    };
  }

  const delta = choice.delta;
  if (!delta) return null;

  // Text token
  if (delta.content !== undefined && delta.content !== null) {
    return { type: 'delta', content: delta.content };
  }

  // Tool call
  if (delta.tool_calls && delta.tool_calls.length > 0) {
    const tc = delta.tool_calls[0];
    if (!tc) return null;
    return {
      type: 'tool_call',
      toolCall: {
        id: tc.id ?? `tc-${tc.index}`,
        name: tc.function?.name ?? '',
        argsPartial: tc.function?.arguments ?? '',
      },
    };
  }

  return null;
}
