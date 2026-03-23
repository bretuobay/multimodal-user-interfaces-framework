/**
 * Demo streaming chat API route.
 * Returns a fake SSE stream that simulates an LLM response token by token.
 * Replace this with a real LLM call (OpenAI, Anthropic, etc.) in production.
 */

import type { NextRequest } from 'next/server';

export const runtime = 'edge';

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
}

const DEMO_RESPONSES = [
  'MUIX is a framework-agnostic multimodal UI runtime for the web. ',
  'It provides primitives for building interfaces that work with text, audio, video, motion, and agent/LLM modalities. ',
  'The core architecture is based on Signals, Channels, Sessions, Actions, and Policies — ',
  'giving you streaming-first, interruptible interactions with full backpressure support. ',
  'This response is being streamed token by token using the AgentChannel and SSE parsing.',
];

function makeSSEChunk(content: string): string {
  const data = JSON.stringify({
    choices: [{ delta: { content }, finish_reason: null }],
  });
  return `data: ${data}\n\n`;
}

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json() as ChatRequest;
  const lastMessage = body.messages[body.messages.length - 1];
  const userText = typeof lastMessage?.content === 'string'
    ? lastMessage.content
    : 'Hello!';

  const encoder = new TextEncoder();
  let response: string[];

  if (userText.toLowerCase().includes('muix') || userText.toLowerCase().includes('framework')) {
    response = DEMO_RESPONSES;
  } else {
    // Echo the user message with a friendly wrapper
    const words = `You said: "${userText}". This is a demo streaming response from the MUIX framework. Each word arrives as a separate token via SSE. `.split(' ');
    response = words.map((w, i) => (i === words.length - 1 ? w : w + ' '));
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const token of response) {
        // Simulate network latency between tokens
        await new Promise((r) => setTimeout(r, 40));
        controller.enqueue(encoder.encode(makeSSEChunk(token)));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
