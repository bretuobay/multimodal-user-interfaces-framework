/**
 * useAgent — Vue composable for streaming LLM responses via AgentChannel.
 */

import { shallowRef, ref, onScopeDispose } from 'vue';
import type { AgentChannel, AgentMessage, AgentStreamFrame } from '@muix/agent';

export interface UseAgentOptions {
  channel: AgentChannel;
}

export interface UseAgentResult {
  send: (message: AgentMessage) => void;
  history: ReturnType<typeof ref<AgentMessage[]>>;
  streamingText: ReturnType<typeof shallowRef<string>>;
  isStreaming: ReturnType<typeof shallowRef<boolean>>;
  cancel: () => void;
  clear: () => void;
}

export function useAgent(options: UseAgentOptions): UseAgentResult {
  const { channel } = options;
  const history = ref<AgentMessage[]>([]);
  const streamingText = shallowRef('');
  const isStreaming = shallowRef(false);

  let currentAction: { cancel(): void } | null = null;
  let currentSub: { unsubscribe(): void } | null = null;

  const send = (message: AgentMessage): void => {
    cancel();

    history.value = [...history.value, message];
    streamingText.value = '';
    isStreaming.value = true;

    const action = channel.sendMessage(message);
    currentAction = action;

    currentSub = channel.observe().subscribe({
      next: (frame) => {
        const f = frame.data as AgentStreamFrame;
        if (f.type === 'delta' && f.content) {
          streamingText.value += f.content;
        }
        if (f.type === 'done' || f.type === 'error') {
          isStreaming.value = false;
          if (streamingText.value) {
            history.value = [
              ...history.value,
              { role: 'assistant', content: streamingText.value },
            ];
            streamingText.value = '';
          }
          currentSub?.unsubscribe();
          currentSub = null;
        }
      },
    });
  };

  const cancel = (): void => {
    currentAction?.cancel();
    currentSub?.unsubscribe();
    currentAction = null;
    currentSub = null;
    isStreaming.value = false;
  };

  const clear = (): void => {
    cancel();
    history.value = [];
    streamingText.value = '';
  };

  onScopeDispose(() => cancel());

  return { send, history, streamingText, isStreaming, cancel, clear };
}
