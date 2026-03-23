import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createAgentChannel } from '@muix/agent';
import { useAgent } from '../use-agent.js';

function makeSSEBody(tokens: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for (const token of tokens) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              choices: [{ delta: { content: token }, finish_reason: null }],
            })}\n\n`,
          ),
        );
        await Promise.resolve();
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

function AgentHarness() {
  const channel = React.useMemo(
    () => createAgentChannel({ endpoint: '/api/chat' }),
    [],
  );
  const { send, history, streamingText, isStreaming } = useAgent({ channel });

  return (
    <div>
      <button onClick={() => send({ role: 'user', content: 'Hello' })}>
        Send
      </button>
      <div data-testid="streaming">{streamingText}</div>
      <div data-testid="streaming-state">{String(isStreaming)}</div>
      <div data-testid="history-count">{history.length}</div>
      <div data-testid="assistant-message">
        {history.find((message) => message.role === 'assistant')?.content ?? ''}
      </div>
    </div>
  );
}

describe('useAgent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('updates streaming text and appends the assistant response on completion', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: makeSSEBody(['Hello', ' world']),
      } satisfies Partial<Response>),
    );

    render(<AgentHarness />);
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() =>
      expect(screen.getByTestId('streaming').textContent).toContain('Hello'),
    );

    await waitFor(() =>
      expect(screen.getByTestId('assistant-message').textContent).toBe(
        'Hello world',
      ),
    );

    expect(screen.getByTestId('history-count').textContent).toBe('2');
    expect(screen.getByTestId('streaming-state').textContent).toBe('false');
  });
});
