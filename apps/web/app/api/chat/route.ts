import type { NextRequest } from 'next/server';

export const runtime = 'edge';

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
}

type Script = {
  latencyMs: number;
  chunks: string[];
};

function tokenize(text: string): string[] {
  const tokens = text.match(/(\S+\s*|\n+)/g) ?? [];
  return tokens.filter(Boolean);
}

function scriptFromParagraphs(paragraphs: string[], latencyMs: number): Script {
  return {
    latencyMs,
    chunks: paragraphs.flatMap((paragraph) => tokenize(`${paragraph}\n\n`)),
  };
}

function detectDepth(text: string): 'concise' | 'detailed' | 'deep' {
  const normalized = text.toLowerCase();
  if (normalized.includes('depth preference: deep')) return 'deep';
  if (normalized.includes('depth preference: concise')) return 'concise';
  return 'detailed';
}

function buildScript(userText: string): Script {
  const normalized = userText.toLowerCase();
  const depth = detectDepth(userText);

  const depthLine =
    depth === 'deep'
      ? 'Go deeper than usual and connect the visible UI to the runtime internals.'
      : depth === 'concise'
        ? 'Keep the explanation compact and direct.'
        : 'Balance clarity with enough implementation detail to teach the idea.';

  if (
    normalized.includes('interruption') ||
    normalized.includes('cancel') ||
    normalized.includes('stop mid-stream')
  ) {
    return scriptFromParagraphs(
      [
        'This scenario is intentionally longer so cancellation is obvious. In MUIX, interruption is a runtime concept, not a convenience button glued on at the end.',
        'The active action owns an AbortSignal. When the user cancels, the stream stops, downstream observers settle, and the session remains usable for the next command instead of collapsing into a broken state.',
        'The important product effect is confidence. You can stop a half-finished response, change intent, and immediately start a new one because the framework treats interruption as part of the happy path.',
        depthLine,
      ],
      58,
    );
  }

  if (
    normalized.includes('gesture') ||
    normalized.includes('motion') ||
    normalized.includes('tap') ||
    normalized.includes('swipe')
  ) {
    return scriptFromParagraphs(
      [
        'The motion surface is not decorative. Raw pointer frames enter a motion channel, then a gesture recognizer upgrades those low-level events into semantic commands such as tap, swipe, and pinch.',
        'That separation is the value of the framework. Input capture, gesture recognition, runtime routing, and UI response are distinct layers, but they all compose through the same channel model.',
        'In this demo, tap runs the active scenario, swipe changes the active narrative, and pinch adjusts answer depth. You are steering the agent experience through a modality other than text while the runtime remains inspectable.',
        depthLine,
      ],
      42,
    );
  }

  if (
    normalized.includes('runtime') ||
    normalized.includes('session') ||
    normalized.includes('channel') ||
    normalized.includes('devtools')
  ) {
    return scriptFromParagraphs(
      [
        'A MUIX session is the bounded unit of interaction. It owns lifecycle and state, while channels represent the active streams moving through that session.',
        'This showcase mirrors agent, motion, and gesture traffic into session-managed telemetry channels so the runtime snapshot and devtools panel can inspect real frame flow instead of synthetic counters.',
        'That is the point of the framework: multimodal behavior stays observable. You do not have to choose between a polished interface and inspectable internals because the primitives are designed to support both.',
        depthLine,
      ],
      46,
    );
  }

  return scriptFromParagraphs(
    [
      'MUIX is a browser-native runtime for multimodal interfaces. It gives text, motion, audio, video, and agent interactions a shared model built on sessions, channels, signals, actions, capabilities, and policies.',
      'This showcase emphasizes the power of that model. The UI is product-like, but the runtime stays visible: agent frames stream live, gestures steer the experience, capability status is probed in place, and devtools can inspect the same session.',
      'You are not just seeing a chat demo. You are seeing a single interaction surface where multimodal input, runtime observability, and interruptible streaming share one set of primitives.',
      depthLine,
    ],
    38,
  );
}

function makeSSEChunk(content: string): string {
  return `data: ${JSON.stringify({
    choices: [{ delta: { content }, finish_reason: null }],
  })}\n\n`;
}

export async function POST(request: NextRequest): Promise<Response> {
  const body = (await request.json()) as ChatRequest;
  const lastMessage = body.messages[body.messages.length - 1];
  const userText =
    typeof lastMessage?.content === 'string' ? lastMessage.content : 'Show me the framework.';
  const script = buildScript(userText);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of script.chunks) {
        await new Promise((resolve) => setTimeout(resolve, script.latencyMs));
        controller.enqueue(encoder.encode(makeSSEChunk(chunk)));
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
