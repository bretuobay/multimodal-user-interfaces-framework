/**
 * TextChannel — streaming text modality.
 * Carries string tokens (deltas) as they stream in from an LLM or user input.
 */

import { Channel, type ChannelOptions, type ChannelFrame } from '@muix/core';

/** A single streamed text token/delta */
export interface TextToken {
  /** The text content of this token */
  text: string;
  /** Whether this is the final token in the sequence */
  final?: boolean;
}

export class TextChannel extends Channel<TextToken, TextToken> {
  constructor(options?: ChannelOptions) {
    super(options);
  }

  /** Convenience: send a text delta */
  async sendToken(text: string, final = false): Promise<void> {
    await this.send({ text, final });
  }

  /** Convenience: send multiple tokens from an async iterable */
  async streamTokens(
    source: AsyncIterable<string>,
    signal?: AbortSignal,
  ): Promise<void> {
    const tokens = [...(await collect(source))];
    for (let i = 0; i < tokens.length; i++) {
      if (signal?.aborted) break;
      const token = tokens[i];
      if (token !== undefined) {
        await this.sendToken(token, i === tokens.length - 1);
      }
    }
  }
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const item of iterable) {
    results.push(item);
  }
  return results;
}

/**
 * Accumulate TextToken frames into a full string.
 * Reads from a TextChannel's readable stream.
 */
export async function accumulateText(
  frames: AsyncIterable<ChannelFrame<TextToken>>,
  signal?: AbortSignal,
): Promise<string> {
  let result = '';
  for await (const frame of frames) {
    if (signal?.aborted) break;
    result += frame.data.text;
    if (frame.data.final) break;
  }
  return result;
}

/** Factory */
export function createTextChannel(options?: ChannelOptions): TextChannel {
  return new TextChannel(options);
}
