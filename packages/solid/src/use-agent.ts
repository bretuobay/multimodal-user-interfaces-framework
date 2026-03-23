/**
 * useAgent — Solid.js composable for streaming LLM responses via AgentChannel.
 */

import { createSignal as createSolidSignal, onCleanup } from 'solid-js';
import type { AgentChannel, AgentMessage, AgentStreamFrame } from '@muix/agent';

export interface UseAgentOptions {
  channel: AgentChannel;
}

export interface UseAgentResult {
  send: (message: AgentMessage) => void;
  history: () => AgentMessage[];
  streamingText: () => string;
  isStreaming: () => boolean;
  cancel: () => void;
  clear: () => void;
}

export function useAgent(options: UseAgentOptions): UseAgentResult {
  const { channel } = options;

  const [history, setHistory] = createSolidSignal<AgentMessage[]>([]);
  const [streamingText, setStreamingText] = createSolidSignal('');
  const [isStreaming, setIsStreaming] = createSolidSignal(false);

  let currentAction: { cancel(): void } | null = null;
  let currentSub: { unsubscribe(): void } | null = null;

  const cancel = (): void => {
    currentAction?.cancel();
    currentSub?.unsubscribe();
    currentAction = null;
    currentSub = null;
    setIsStreaming(false);
  };

  const send = (message: AgentMessage): void => {
    cancel();

    setHistory((h) => [...h, message]);
    setStreamingText('');
    setIsStreaming(true);

    const action = channel.sendMessage(message);
    currentAction = action;

    currentSub = channel.observe().subscribe({
      next: (frame) => {
        const f = frame.data as AgentStreamFrame;
        if (f.type === 'delta' && f.content) {
          setStreamingText((t) => t + f.content!);
        }
        if (f.type === 'done' || f.type === 'error') {
          setIsStreaming(false);
          const text = streamingText();
          if (text) {
            setHistory((h) => [...h, { role: 'assistant', content: text }]);
            setStreamingText('');
          }
          currentSub?.unsubscribe();
          currentSub = null;
        }
      },
    });
  };

  const clear = (): void => {
    cancel();
    setHistory([]);
    setStreamingText('');
  };

  onCleanup(() => cancel());

  return { send, history, streamingText, isStreaming, cancel, clear };
}
