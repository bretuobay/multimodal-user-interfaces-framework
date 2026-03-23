/**
 * Agent/LLM types — streaming chat messages, tool calls, agent events.
 */

export type AgentRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AgentTextContent {
  type: 'text';
  text: string;
}

export interface AgentImageContent {
  type: 'image_url';
  url: string;
  detail?: 'low' | 'high' | 'auto';
}

export interface AgentToolUseContent {
  type: 'tool_use';
  toolCallId: string;
  name: string;
  input: unknown;
}

export interface AgentToolResultContent {
  type: 'tool_result';
  toolCallId: string;
  content: string;
  isError?: boolean;
}

export type AgentContentPart =
  | AgentTextContent
  | AgentImageContent
  | AgentToolUseContent
  | AgentToolResultContent;

export interface AgentMessage {
  readonly role: AgentRole;
  readonly content: string | AgentContentPart[];
}

/** A frame emitted by a streaming LLM response */
export type AgentStreamFrameType =
  | 'delta'        // text token
  | 'tool_call'    // tool invocation (may stream partial JSON args)
  | 'tool_result'  // result of a tool call
  | 'done'         // final frame
  | 'error';       // error frame

export type AgentFinishReason =
  | 'stop'
  | 'tool_use'
  | 'length'
  | 'cancelled'
  | 'error';

export interface AgentStreamFrame {
  type: AgentStreamFrameType;
  /** Text token (for 'delta' type) */
  content?: string;
  /** Tool call info (for 'tool_call' type) */
  toolCall?: {
    id: string;
    name: string;
    /** Partial/complete JSON arguments (may be streamed in chunks) */
    argsPartial: string;
  };
  /** Tool result (for 'tool_result' type) */
  toolResult?: {
    toolCallId: string;
    result: unknown;
    isError?: boolean;
  };
  /** Error (for 'error' type) */
  error?: unknown;
  /** Finish reason (for 'done' type) */
  finishReason?: AgentFinishReason;
}

export interface AgentTool {
  readonly name: string;
  readonly description: string;
  /** JSON Schema for the tool parameters */
  readonly parameters: Record<string, unknown>;
  execute(
    args: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<unknown>;
}

export interface AgentChannelOptions {
  id?: string;
  /** Endpoint URL for the LLM API (e.g. /api/chat) */
  endpoint: string;
  /** Extra headers to include in every request */
  headers?: Record<string, string>;
  /** Model identifier to pass in the request body */
  model?: string;
}

export interface SendOptions {
  signal?: AbortSignal;
}
