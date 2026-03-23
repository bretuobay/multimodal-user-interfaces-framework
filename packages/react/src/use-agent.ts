/**
 * useAgent — React hook for LLM streaming interactions.
 */

import { useState, useCallback, useRef } from 'react';
import type { AgentChannel, AgentMessage, AgentStreamFrame } from '@muix/agent';

export interface UseAgentOptions {
  channel: AgentChannel;
}

export interface UseAgentResult {
  /** Send a message and start streaming */
  send: (message: AgentMessage) => void;
  /** Accumulated message history */
  history: AgentMessage[];
  /** Streaming frames from the current response */
  streamFrames: AgentStreamFrame[];
  /** Whether the agent is currently streaming */
  isStreaming: boolean;
  /** Text assembled from current stream deltas */
  streamingText: string;
  /** Cancel the current stream */
  cancel: () => void;
  /** Clear history */
  clear: () => void;
  /** Last error, if any */
  error: unknown | null;
}

export function useAgent({ channel }: UseAgentOptions): UseAgentResult {
  const [history, setHistory] = useState<AgentMessage[]>([]);
  const [streamFrames, setStreamFrames] = useState<AgentStreamFrame[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const send = useCallback(
    (message: AgentMessage) => {
      // Cancel any existing stream
      cancelRef.current?.();
      setStreamFrames([]);
      setStreamingText('');
      setError(null);
      setIsStreaming(true);

      setHistory((prev) => [...prev, message]);

      const abortController = new AbortController();
      cancelRef.current = () => abortController.abort();

      const action = channel.sendMessage(message, { signal: abortController.signal });

      let accumulated = '';

      // Observe streaming progress
      const sub = action.observe().subscribe({
        next: (progress) => {
          const partial = progress.partial;
          if (Array.isArray(partial)) {
            setStreamFrames([...partial]);
            // Rebuild streaming text from deltas
            accumulated = partial
              .filter((f: AgentStreamFrame) => f.type === 'delta' && f.content)
              .map((f: AgentStreamFrame) => f.content ?? '')
              .join('');
            setStreamingText(accumulated);
          }
        },
      });

      action.status.observe().subscribe({
        next: (status) => {
          if (status === 'completed') {
            setIsStreaming(false);
            // Update history with assistant response
            if (accumulated) {
              setHistory((prev) => [
                ...prev,
                { role: 'assistant', content: accumulated },
              ]);
            }
            sub.unsubscribe();
          } else if (status === 'failed') {
            setIsStreaming(false);
            setError(action.error.value);
            sub.unsubscribe();
          } else if (status === 'cancelled') {
            setIsStreaming(false);
            sub.unsubscribe();
          }
        },
      });
    },
    [channel],
  );

  const cancel = useCallback(() => {
    cancelRef.current?.();
    setIsStreaming(false);
  }, []);

  const clear = useCallback(() => {
    cancelRef.current?.();
    setHistory([]);
    setStreamFrames([]);
    setStreamingText('');
    setIsStreaming(false);
    setError(null);
    channel.clearHistory();
  }, [channel]);

  return {
    send,
    history,
    streamFrames,
    isStreaming,
    streamingText,
    cancel,
    clear,
    error,
  };
}
