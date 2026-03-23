/**
 * AgentChannel — LLM streaming modality.
 * Sends AgentMessages to an endpoint and streams AgentStreamFrames back.
 */

import { Channel, createAction, type Action } from '@muix/core';
import { parseSSEStream } from './sse-parser.js';
import { ToolRegistry } from './tool-registry.js';
import type {
  AgentChannelOptions,
  AgentMessage,
  AgentStreamFrame,
  AgentTool,
  SendOptions,
} from './types.js';

export class AgentChannel extends Channel<AgentMessage, AgentStreamFrame> {
  readonly tools: ToolRegistry;
  private readonly _endpoint: string;
  private readonly _headers: Record<string, string>;
  private readonly _model: string | undefined;
  private readonly _history: AgentMessage[] = [];

  constructor(options: AgentChannelOptions) {
    super({ id: options.id });
    this._endpoint = options.endpoint;
    this._headers = options.headers ?? {};
    this._model = options.model;
    this.tools = new ToolRegistry();
  }

  registerTool(tool: AgentTool): void {
    this.tools.register(tool);
  }

  get history(): AgentMessage[] {
    return [...this._history];
  }

  clearHistory(): void {
    this._history.length = 0;
  }

  /**
   * Send a message to the LLM and stream the response.
   * Returns an Action that completes when the stream ends.
   */
  sendMessage(message: AgentMessage, options?: SendOptions): Action<AgentStreamFrame[]> {
    this._history.push(message);

    const action = createAction<AgentStreamFrame[]>('agent:send');
    action._setRunning();

    const abortController = new AbortController();
    // Link external signal
    if (options?.signal) {
      options.signal.addEventListener('abort', () => {
        abortController.abort();
        action.cancel('External abort');
      });
    }
    // Link action's own signal
    action.signal.addEventListener('abort', () => abortController.abort());

    (async () => {
      const frames: AgentStreamFrame[] = [];

      try {
        const messages = this._buildMessages();
        const body: Record<string, unknown> = {
          messages,
          stream: true,
        };
        if (this._model) body['model'] = this._model;
        if (this.tools.all().length > 0) {
          body['tools'] = this.tools.toOpenAITools();
        }

        const response = await fetch(this._endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this._headers,
          },
          body: JSON.stringify(body),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Agent endpoint returned ${response.status}: ${response.statusText}`,
          );
        }

        if (!response.body) {
          throw new Error('Agent endpoint returned no body');
        }

        let assistantContent = '';
        const toolCallBuffers = new Map<string, { name: string; args: string }>();

        for await (const frame of parseSSEStream(
          response.body,
          abortController.signal,
        )) {
          if (abortController.signal.aborted) break;

          frames.push(frame);
          action._emitProgress({ partial: [...frames] });

          // Send to channel's outbound stream
          if (this.status.value === 'open' || this.status.value === 'idle') {
            await this.send_frame(frame);
          }

          // Accumulate for history
          if (frame.type === 'delta' && frame.content) {
            assistantContent += frame.content;
          }

          // Accumulate tool call args
          if (frame.type === 'tool_call' && frame.toolCall) {
            const { id, name, argsPartial } = frame.toolCall;
            const existing = toolCallBuffers.get(id) ?? { name, args: '' };
            toolCallBuffers.set(id, { name, args: existing.args + argsPartial });
          }

          // Handle tool results
          if (frame.type === 'done' && frame.finishReason === 'tool_use') {
            for (const [toolCallId, { name, args }] of toolCallBuffers) {
              let parsedArgs: Record<string, unknown> = {};
              try {
                parsedArgs = JSON.parse(args) as Record<string, unknown>;
              } catch {
                parsedArgs = {};
              }

              let toolResult: unknown;
              let isError = false;
              try {
                toolResult = await this.tools.execute(
                  name,
                  parsedArgs,
                  abortController.signal,
                );
              } catch (e: unknown) {
                toolResult = String(e);
                isError = true;
              }

              const resultFrame: AgentStreamFrame = {
                type: 'tool_result',
                toolResult: { toolCallId, result: toolResult, isError },
              };
              frames.push(resultFrame);
              action._emitProgress({ partial: [...frames] });
              await this.send_frame(resultFrame);
            }
          }

          if (frame.type === 'done' || frame.type === 'error') break;
        }

        // Add assistant response to history
        if (assistantContent) {
          this._history.push({ role: 'assistant', content: assistantContent });
        }

        if (!abortController.signal.aborted) {
          action._setCompleted(frames);
        }
      } catch (e: unknown) {
        if (!abortController.signal.aborted) {
          action._setFailed(e);
          await this.send_frame({ type: 'error', error: e });
        }
      }
    })();

    return action;
  }

  private async send_frame(frame: AgentStreamFrame): Promise<void> {
    try {
      await this.send(frame);
    } catch {
      // Channel may be closed
    }
  }

  private _buildMessages(): Array<{ role: string; content: string | unknown[] }> {
    return this._history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }
}

export function createAgentChannel(options: AgentChannelOptions): AgentChannel {
  return new AgentChannel(options);
}
