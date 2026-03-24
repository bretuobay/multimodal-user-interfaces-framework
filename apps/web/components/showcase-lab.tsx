'use client';

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from 'react';
import {
  createAgentChannel,
  type AgentMessage,
  type AgentStreamFrame,
} from '@muix/agent';
import {
  createCapabilityRegistry,
  microphoneCapability,
  cameraCapability,
  screenCaptureCapability,
  speechRecognitionCapability,
  speechSynthesisCapability,
  webRTCCapability,
  inlineXrCapability,
  type CapabilityDescriptor,
  type CapabilityStatus,
} from '@muix/capability';
import {
  createSession,
  type Channel,
  type Session,
} from '@muix/core';
import { SessionInspector, type SessionSnapshot } from '@muix/devtools';
import {
  DeviceOrientationSource,
  PointerSource,
  createGestureRecognizer,
  createMotionChannel,
  type MotionEvent,
  type PointerEventData,
} from '@muix/motion';
import { StaticCodeBlock } from '@repo/ui';
import { SessionProvider, useAgent, useSession, useSignal } from '@muix/react';
import styles from './showcase-lab.module.css';

type Tone = 'accent' | 'success' | 'warn' | 'neutral';

interface DemoScenario {
  id: string;
  title: string;
  summary: string;
  prompt: string;
  chip: string;
}

interface EventLogEntry {
  id: string;
  title: string;
  detail: string;
  at: string;
  tone: Tone;
}

interface CapabilityCard {
  id: string;
  label: string;
  description: string;
  status: CapabilityStatus;
  usedByDemo: boolean;
}

interface MotionStats {
  rawFrames: number;
  gestures: number;
  taps: number;
  swipes: number;
  pinches: number;
  pointer: { x: number; y: number } | null;
}

interface RuntimeChannels {
  agent: Channel<AgentStreamFrame, AgentStreamFrame>;
  motion: Channel<MotionEvent, MotionEvent>;
  gestures: Channel<MotionEvent, MotionEvent>;
}

interface CodeExample {
  code: string;
  html: string;
  language: string;
  title: string;
}

interface DevtoolsElement extends HTMLElement {
  attach(session: Session): void;
  detach(): void;
}

const SCENARIOS: DemoScenario[] = [
  {
    id: 'streaming',
    title: 'Streaming Systems',
    chip: 'Stream',
    summary: 'Show the incremental token pipeline and explain why interruption matters.',
    prompt:
      'Explain how MUIX handles streaming-first interfaces and highlight what happens while tokens are still arriving.',
  },
  {
    id: 'interruption',
    title: 'Interruptibility',
    chip: 'Interrupt',
    summary: 'Demonstrate cancellation as a first-class runtime behavior rather than a UI afterthought.',
    prompt:
      'Give me a longer explanation of interruption, cancellation, and recoverable session state in MUIX. Make it suitable for testing stop mid-stream.',
  },
  {
    id: 'runtime',
    title: 'Runtime Visibility',
    chip: 'Inspect',
    summary: 'Connect the visible app behavior to sessions, channels, frame logs, and devtools.',
    prompt:
      'Describe how sessions, channels, policies, capabilities, and devtools work together as one runtime in MUIX.',
  },
];

const DEPTH_LEVELS = [
  {
    label: 'Concise',
    instruction:
      'Respond in a compact way with only the essential ideas and one clear example.',
  },
  {
    label: 'Detailed',
    instruction:
      'Respond with enough detail to teach the idea clearly, but keep it skimmable.',
  },
  {
    label: 'Deep',
    instruction:
      'Respond in a rich, layered way that feels like a flagship demo explanation.',
  },
];

const DEFAULT_SCENARIO = SCENARIOS[0]!;
const DEFAULT_DEPTH = DEPTH_LEVELS[1] ?? DEPTH_LEVELS[0]!;

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function clip(text: string, max = 86): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function statusClass(status: string): string {
  switch (status) {
    case 'streaming':
    case 'active':
    case 'open':
      return styles.statusStreaming ?? '';
    case 'complete':
    case 'completed':
      return styles.statusComplete ?? '';
    case 'cancelled':
      return styles.statusCancelled ?? '';
    case 'error':
    case 'errored':
      return styles.statusError ?? '';
    default:
      return styles.statusIdle ?? '';
  }
}

function capabilityClass(status: CapabilityStatus): string {
  switch (status) {
    case 'available':
      return styles.tagAvailable ?? '';
    case 'degraded':
      return styles.tagDegraded ?? '';
    case 'unknown':
      return styles.tagUnknown ?? '';
    default:
      return styles.tagUnavailable ?? '';
  }
}

function logToneClass(tone: Tone): string {
  switch (tone) {
    case 'accent':
      return styles.logToneAccent ?? '';
    case 'success':
      return styles.logToneSuccess ?? '';
    case 'warn':
      return styles.logToneWarn ?? '';
    default:
      return '';
  }
}

function buildPrompt(
  scenario: DemoScenario,
  depthIndex: number,
  contextNote?: string,
): AgentMessage {
  const depth = DEPTH_LEVELS[depthIndex] ?? DEFAULT_DEPTH;
  return {
    role: 'user',
    content: [
      scenario.prompt,
      `Depth preference: ${depth.label}. ${depth.instruction}`,
      contextNote,
      'Anchor the response in the current demo and mention sessions, channels, interruption, and observability where relevant.',
    ]
      .filter(Boolean)
      .join('\n\n'),
  };
}

function heroMetricValue(snapshot: SessionSnapshot | null, fallback: string): string {
  if (!snapshot) return fallback;
  return String(snapshot.channels.length);
}

export function ShowcaseLab({ codeExample }: { codeExample: CodeExample }) {
  const session = useMemo(() => createSession({ id: 'showcase-lab' }), []);
  const agentChannel = useMemo(
    () => createAgentChannel({ endpoint: '/api/chat' }),
    [],
  );
  const motionChannel = useMemo(() => createMotionChannel({ id: 'motion-source' }), []);
  const gestureChannel = useMemo(
    () => motionChannel.pipe(createGestureRecognizer()),
    [motionChannel],
  );
  const runtimeChannelsRef = useRef<RuntimeChannels | null>(null);

  if (!runtimeChannelsRef.current) {
    runtimeChannelsRef.current = {
      agent: session.addChannel<AgentStreamFrame>('agent'),
      motion: session.addChannel<MotionEvent>('motion'),
      gestures: session.addChannel<MotionEvent>('gestures'),
    };
  }

  useEffect(() => {
    return () => {
      gestureChannel.close('Showcase unmounted').catch(() => {});
      motionChannel.close('Showcase unmounted').catch(() => {});
      agentChannel.close('Showcase unmounted').catch(() => {});
      session.terminate('Showcase unmounted').catch(() => {});
    };
  }, [agentChannel, gestureChannel, motionChannel, session]);

  return (
    <SessionProvider session={session}>
      <ShowcaseWorkspace
        agentChannel={agentChannel}
        codeExample={codeExample}
        motionChannel={motionChannel}
        gestureChannel={gestureChannel}
        runtimeChannels={runtimeChannelsRef.current}
      />
    </SessionProvider>
  );
}

function ShowcaseWorkspace({
  agentChannel,
  codeExample,
  motionChannel,
  gestureChannel,
  runtimeChannels,
}: {
  agentChannel: ReturnType<typeof createAgentChannel>;
  codeExample: CodeExample;
  motionChannel: ReturnType<typeof createMotionChannel>;
  gestureChannel: Channel<MotionEvent, MotionEvent>;
  runtimeChannels: RuntimeChannels;
}) {
  const session = useSession();
  const sessionStatus = useSignal(session.status);
  const runtimeAgentStatus = useSignal(runtimeChannels.agent.status);
  const runtimeMotionStatus = useSignal(runtimeChannels.motion.status);
  const runtimeGestureStatus = useSignal(runtimeChannels.gestures.status);
  const { send, history, streamFrames, streamingText, isStreaming, cancel, clear, error } =
    useAgent({ channel: agentChannel });
  const [input, setInput] = useState('');
  const [activeScenarioIndex, setActiveScenarioIndex] = useState(0);
  const [depthIndex, setDepthIndex] = useState(1);
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [capabilities, setCapabilities] = useState<CapabilityCard[]>([]);
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [motionStats, setMotionStats] = useState<MotionStats>({
    rawFrames: 0,
    gestures: 0,
    taps: 0,
    swipes: 0,
    pinches: 0,
    pointer: null,
  });
  const [devtoolsReady, setDevtoolsReady] = useState(false);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const activeScenarioIndexRef = useRef(activeScenarioIndex);
  const depthIndexRef = useRef(depthIndex);
  const isStreamingRef = useRef(isStreaming);
  const deferredEventLog = useDeferredValue(eventLog);

  const appendEvent = useCallback((title: string, detail: string, tone: Tone = 'neutral') => {
    startTransition(() => {
      setEventLog((current) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title,
          detail,
          at: formatTime(new Date()),
          tone,
        },
        ...current,
      ].slice(0, 12));
    });
  }, []);

  const activeScenario = SCENARIOS[activeScenarioIndex] ?? DEFAULT_SCENARIO;

  useEffect(() => {
    activeScenarioIndexRef.current = activeScenarioIndex;
  }, [activeScenarioIndex]);

  useEffect(() => {
    depthIndexRef.current = depthIndex;
  }, [depthIndex]);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    if (sessionStatus !== 'active') return;

    agentChannel.open().catch(() => {});
    motionChannel.open().catch(() => {});
    gestureChannel.open().catch(() => {});
  }, [agentChannel, gestureChannel, motionChannel, sessionStatus]);

  useEffect(() => {
    const inspector = new SessionInspector(session, { updateIntervalMs: 400 });
    inspector.start();
    setSnapshot(inspector.snapshot());
    const unsubscribe = inspector.onChange((next) => {
      startTransition(() => {
        setSnapshot(next);
      });
    });

    return () => {
      unsubscribe();
      inspector.dispose();
    };
  }, [session]);

  useEffect(() => {
    const registry = createCapabilityRegistry();
    const descriptors: Array<{
      descriptor: CapabilityDescriptor<unknown>;
      label: string;
      usedByDemo: boolean;
    }> = [
      { descriptor: microphoneCapability, label: 'Microphone', usedByDemo: false },
      { descriptor: cameraCapability, label: 'Camera', usedByDemo: false },
      { descriptor: screenCaptureCapability, label: 'Screen Capture', usedByDemo: false },
      { descriptor: speechRecognitionCapability, label: 'Speech Recognition', usedByDemo: false },
      { descriptor: speechSynthesisCapability, label: 'Speech Synthesis', usedByDemo: false },
      { descriptor: webRTCCapability, label: 'WebRTC', usedByDemo: false },
      { descriptor: inlineXrCapability, label: 'WebXR Inline', usedByDemo: false },
    ];

    descriptors.forEach(({ descriptor }) => registry.register(descriptor));

    registry.probeAll().then((results) => {
      startTransition(() => {
        setCapabilities(
          descriptors.map(({ descriptor, label, usedByDemo }) => ({
            id: descriptor.id,
            label,
            description: descriptor.description,
            status: results.get(descriptor.id) ?? 'unknown',
            usedByDemo,
          })),
        );
      });
    });
  }, []);

  useEffect(() => {
    appendEvent('Session ready', 'Showcase workspace initialized.', 'success');

    const agentSub = agentChannel.observe().subscribe({
      next: (frame) => {
        runtimeChannels.agent.send(frame.data).catch(() => {});
        if (frame.data.type === 'done') {
          appendEvent('Agent stream settled', `finish=${frame.data.finishReason ?? 'stop'}`, 'accent');
        } else if (frame.data.type === 'error') {
          appendEvent('Agent error frame', String(frame.data.error), 'warn');
        }
      },
    });

    const motionSub = motionChannel.observe().subscribe({
      next: (frame) => {
        runtimeChannels.motion.send(frame.data).catch(() => {});
        if (frame.data.type === 'pointer') {
          const pointer = frame.data as PointerEventData;
          const bounds = surfaceRef.current?.getBoundingClientRect();
          startTransition(() => {
            setMotionStats((current) => ({
              ...current,
              rawFrames: current.rawFrames + 1,
              pointer: bounds
                ? {
                    x: pointer.x - bounds.left,
                    y: pointer.y - bounds.top,
                  }
                : { x: pointer.x, y: pointer.y },
            }));
          });
        }
      },
    });

    const gestureSub = gestureChannel.observe().subscribe({
      next: (frame) => {
        if (frame.data.type !== 'gesture') return;
        const gesture = frame.data;

        runtimeChannels.gestures.send(gesture).catch(() => {});

        startTransition(() => {
          setMotionStats((current) => ({
            ...current,
            gestures: current.gestures + 1,
            taps: current.taps + (gesture.kind === 'tap' ? 1 : 0),
            swipes: current.swipes + (gesture.kind === 'swipe' ? 1 : 0),
            pinches: current.pinches + (gesture.kind === 'pinch' ? 1 : 0),
          }));
        });

        if (gesture.kind === 'tap') {
          appendEvent('Tap gesture', 'Triggered the active agent scenario.', 'accent');
          if (!isStreamingRef.current) {
            send(
              buildPrompt(
                SCENARIOS[activeScenarioIndexRef.current] ?? DEFAULT_SCENARIO,
                depthIndexRef.current,
                'Gesture trigger: tap on the motion surface.',
              ),
            );
          }
        }

        if (gesture.kind === 'swipe') {
          const delta =
            gesture.direction === 'left' || gesture.direction === 'up'
              ? 1
              : -1;
          setActiveScenarioIndex((current) => {
            const next = (current + delta + SCENARIOS.length) % SCENARIOS.length;
            appendEvent(
              'Swipe gesture',
              `Switched focus to ${SCENARIOS[next]?.title ?? 'next scenario'}.`,
              'success',
            );
            return next;
          });
        }

        if (gesture.kind === 'pinch') {
          setDepthIndex((current) => {
            const next =
              gesture.scale > 1
                ? Math.min(DEPTH_LEVELS.length - 1, current + 1)
                : Math.max(0, current - 1);
            appendEvent(
              'Pinch gesture',
              `Adjusted response depth to ${(DEPTH_LEVELS[next] ?? DEFAULT_DEPTH).label}.`,
              'accent',
            );
            return next;
          });
        }
      },
    });

    return () => {
      agentSub.unsubscribe();
      motionSub.unsubscribe();
      gestureSub.unsubscribe();
    };
  }, [agentChannel, appendEvent, gestureChannel, motionChannel, runtimeChannels, send]);

  useEffect(() => {
    if (!surfaceRef.current) return;

    const pointerSource = new PointerSource();
    pointerSource.attach(surfaceRef.current, motionChannel);

    const orientationSource = new DeviceOrientationSource();
    orientationSource.attach(motionChannel);

    return () => {
      pointerSource.detach();
      orientationSource.detach();
    };
  }, [motionChannel]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    let panel: DevtoolsElement | null = null;
    let mounted = true;

    void import('@muix/devtools').then(() => {
      if (!mounted) return;
      panel = document.createElement('muix-devtools') as DevtoolsElement;
      document.body.appendChild(panel);
      panel.attach(session);
      setDevtoolsReady(true);
    });

    return () => {
      mounted = false;
      setDevtoolsReady(false);
      panel?.detach();
      panel?.remove();
    };
  }, [session]);

  useEffect(() => {
    if (isStreaming) {
      appendEvent(
        'Agent streaming',
        'Response is streaming over SSE through AgentChannel.',
        'accent',
      );
    }
  }, [appendEvent, isStreaming]);

  const runtimeSummary = useMemo(
    () => [
      { label: 'Session', value: sessionStatus, hint: session.id },
      {
        label: 'Agent frames',
        value: String(snapshot?.channels.find((entry) => entry.id === 'agent')?.frameCount ?? 0),
        hint: runtimeAgentStatus,
      },
      {
        label: 'Motion frames',
        value: String(snapshot?.channels.find((entry) => entry.id === 'motion')?.frameCount ?? 0),
        hint: runtimeMotionStatus,
      },
      {
        label: 'Gesture frames',
        value: String(snapshot?.channels.find((entry) => entry.id === 'gestures')?.frameCount ?? 0),
        hint: runtimeGestureStatus,
      },
    ],
    [runtimeAgentStatus, runtimeGestureStatus, runtimeMotionStatus, session.id, sessionStatus, snapshot],
  );

  const streamState = error
    ? 'error'
    : isStreaming
      ? 'streaming'
      : history.length > 0
        ? 'complete'
        : 'idle';

  const handleScenarioSend = (scenario: DemoScenario, note?: string) => {
    send(buildPrompt(scenario, depthIndex, note));
  };

  const handleManualSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    send({
      role: 'user',
      content: `${trimmed}\n\nDepth preference: ${
        (DEPTH_LEVELS[depthIndex] ?? DEFAULT_DEPTH).instruction
      }`,
    });
    setInput('');
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <span className={styles.heroEyebrow}>
              <span className={styles.liveDot} />
              Main example app
            </span>
            <h1 className={styles.heroTitle}>MUIX Showcase Lab</h1>
            <p className={styles.heroText}>
              A flagship web demo that makes the runtime visible. Stream agent
              responses, drive the interface with gesture input, inspect live
              session channels, and watch capability negotiation without ever
              leaving the page.
            </p>
            <div className={styles.heroActions}>
              <button
                className={`${styles.heroButton} ${styles.primaryButton}`}
                onClick={() =>
                  handleScenarioSend(
                    activeScenario,
                    'Hero CTA trigger from the showcase lab.',
                  )
                }
                type="button"
              >
                Run active scenario
              </button>
              <button
                className={`${styles.heroButtonSecondary} ${styles.secondaryButton}`}
                onClick={() => {
                  clear();
                  setEventLog([]);
                  setMotionStats({
                    rawFrames: 0,
                    gestures: 0,
                    taps: 0,
                    swipes: 0,
                    pinches: 0,
                    pointer: null,
                  });
                }}
                type="button"
              >
                Reset lab state
              </button>
            </div>
          </div>

          <div className={styles.heroMetrics}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Runtime channels</span>
              <div className={styles.metricValue}>
                {heroMetricValue(snapshot, '3')}
              </div>
              <p className={styles.metricHint}>
                Agent, motion, and gesture telemetry are mirrored into the live
                session so devtools can inspect the example.
              </p>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Gesture bindings</span>
              <div className={styles.metricValue}>Tap / Swipe / Pinch</div>
              <p className={styles.metricHint}>
                Tap runs the active scenario, swipe changes focus, and pinch
                shifts explanation depth.
              </p>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Live state</span>
              <div className={styles.metricValue}>{sessionStatus}</div>
              <p className={styles.metricHint}>
                Session status is sourced directly from the framework signal.
              </p>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Devtools</span>
              <div className={styles.metricValue}>
                {devtoolsReady ? 'Attached' : 'Optional'}
              </div>
              <p className={styles.metricHint}>
                The floating panel auto-attaches in development while the page
                also exposes a compact runtime snapshot inline.
              </p>
            </div>
          </div>
        </section>

        <div className={styles.mainGrid}>
          <div className={styles.stack}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Agent Studio</h2>
                  <p className={styles.cardCopy}>
                    A guided agent panel that emphasizes streaming, starter
                    scenarios, and interruption as core runtime behaviors.
                  </p>
                </div>
                <span className={`${styles.statusPill} ${statusClass(streamState)}`}>
                  {streamState}
                </span>
              </div>

              <div className={styles.chipRow}>
                {SCENARIOS.map((scenario, index) => (
                  <button
                    key={scenario.id}
                    className={`${styles.chipButton} ${
                      index === activeScenarioIndex ? styles.chipButtonActive : ''
                    }`}
                    onClick={() => setActiveScenarioIndex(index)}
                    type="button"
                  >
                    {scenario.chip}
                  </button>
                ))}
              </div>

              <div className={styles.scenarioGrid}>
                {SCENARIOS.map((scenario, index) => (
                  <button
                    key={scenario.id}
                    className={`${styles.scenarioCard} ${
                      index === activeScenarioIndex ? styles.scenarioCardActive : ''
                    }`}
                    onClick={() => {
                      setActiveScenarioIndex(index);
                      handleScenarioSend(
                        scenario,
                        `Starter scenario selected: ${scenario.title}.`,
                      );
                    }}
                    type="button"
                  >
                    <div className={styles.scenarioTitle}>{scenario.title}</div>
                    <p className={styles.scenarioSummary}>{scenario.summary}</p>
                  </button>
                ))}
              </div>

              <div className={styles.composer}>
                <div className={styles.depthControl}>
                  <span className={styles.depthLabel}>Response depth</span>
                  {DEPTH_LEVELS.map((depth, index) => (
                    <button
                      key={depth.label}
                      className={`${styles.depthButton} ${
                        index === depthIndex ? styles.depthButtonActive : ''
                      }`}
                      onClick={() => setDepthIndex(index)}
                      type="button"
                    >
                      {depth.label}
                    </button>
                  ))}
                </div>

                <div className={styles.composerRow}>
                  <input
                    className={styles.input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleManualSend();
                      }
                    }}
                    placeholder="Ask the lab to explain the current runtime state, gestures, or channel behavior..."
                    value={input}
                  />
                  <button
                    className={`${styles.controlButton} ${styles.primaryButton}`}
                    onClick={handleManualSend}
                    type="button"
                  >
                    Send prompt
                  </button>
                  <button
                    className={`${styles.controlButton} ${
                      isStreaming ? styles.dangerButton : styles.secondaryButton
                    }`}
                    onClick={isStreaming ? cancel : () => handleScenarioSend(activeScenario)}
                    type="button"
                  >
                    {isStreaming ? 'Cancel stream' : 'Run active'}
                  </button>
                </div>
              </div>

              <div className={styles.conversation}>
                {history.slice(-4).map((message, index) => (
                  <article
                    className={`${styles.message} ${
                      message.role === 'user' ? styles.messageUser : styles.messageAssistant
                    }`}
                    key={`${message.role}-${index}`}
                  >
                    <span className={styles.messageMeta}>{message.role}</span>
                    <div className={styles.messageBody}>
                      {typeof message.content === 'string'
                        ? message.content
                        : JSON.stringify(message.content)}
                    </div>
                  </article>
                ))}

                {isStreaming && (
                  <div className={styles.streamCard}>
                    <span className={styles.messageMeta}>assistant / streaming</span>
                    <div className={styles.messageBody}>
                      {streamingText}
                      <span className={styles.cursor}>▋</span>
                    </div>
                  </div>
                )}

                {error ? (
                  <div className={styles.emptyState}>
                    {String(error)}
                  </div>
                ) : null}
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Motion Surface</h2>
                  <p className={styles.cardCopy}>
                    Pointer frames flow through the motion channel. Gesture
                    recognition upgrades them into semantic controls for the
                    showcase.
                  </p>
                </div>
                <span className={`${styles.statusPill} ${statusClass(runtimeMotionStatus)}`}>
                  {runtimeMotionStatus}
                </span>
              </div>

              <div
                className={styles.motionSurface}
                ref={surfaceRef}
                role="button"
                tabIndex={0}
              >
                <div className={styles.motionCopy}>
                  <h3 className={styles.motionTitle}>Touch, drag, and steer the demo</h3>
                  <p className={styles.motionHint}>
                    Tap to run the current scenario. Swipe left or right to
                    rotate the story. Pinch on touch devices to change response
                    depth. Pointer activity is mirrored into the runtime panel.
                  </p>
                </div>

                <span className={styles.surfaceBadge}>Gesture-controlled</span>

                {motionStats.pointer ? (
                  <span
                    className={styles.pointerOrb}
                    style={{
                      left: `${motionStats.pointer.x}px`,
                      top: `${motionStats.pointer.y}px`,
                    }}
                  />
                ) : null}

                <div className={styles.motionStats}>
                  <div className={styles.motionStat}>
                    <div className={styles.motionStatLabel}>Raw frames</div>
                    <div className={styles.motionStatValue}>{motionStats.rawFrames}</div>
                  </div>
                  <div className={styles.motionStat}>
                    <div className={styles.motionStatLabel}>Gestures</div>
                    <div className={styles.motionStatValue}>{motionStats.gestures}</div>
                  </div>
                  <div className={styles.motionStat}>
                    <div className={styles.motionStatLabel}>Active focus</div>
                    <div className={styles.motionStatValue}>{activeScenario.title}</div>
                  </div>
                </div>
              </div>

              <div className={styles.gestureLegend}>
                <div className={styles.gestureLegendRow}>
                  <div>
                    <div className={styles.gestureLegendTitle}>Tap</div>
                    <div className={styles.gestureLegendCopy}>
                      Runs the currently selected scenario prompt.
                    </div>
                  </div>
                  <span className={styles.chip}>taps {motionStats.taps}</span>
                </div>
                <div className={styles.gestureLegendRow}>
                  <div>
                    <div className={styles.gestureLegendTitle}>Swipe</div>
                    <div className={styles.gestureLegendCopy}>
                      Cycles between streaming, interruption, and runtime
                      narratives.
                    </div>
                  </div>
                  <span className={styles.chip}>swipes {motionStats.swipes}</span>
                </div>
                <div className={styles.gestureLegendRow}>
                  <div>
                    <div className={styles.gestureLegendTitle}>Pinch</div>
                    <div className={styles.gestureLegendCopy}>
                      Adjusts response depth on touch devices. Depth buttons are
                      available as a desktop fallback.
                    </div>
                  </div>
                  <span className={styles.chip}>pinches {motionStats.pinches}</span>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Runtime Slice</h2>
                  <p className={styles.cardCopy}>
                    One compact example from the setup behind this page. The
                    same runtime pieces drive the live showcase and the docs.
                  </p>
                </div>
                <span className={styles.chip}>Shared code surface</span>
              </div>

              <StaticCodeBlock
                code={codeExample.code}
                html={codeExample.html}
                language={codeExample.language}
                title={codeExample.title}
              />
            </section>
          </div>

          <div className={styles.stack}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Runtime Snapshot</h2>
                  <p className={styles.cardCopy}>
                    Live session and channel state from the same runtime that
                    powers the example.
                  </p>
                </div>
                <span className={`${styles.statusPill} ${statusClass(sessionStatus)}`}>
                  {sessionStatus}
                </span>
              </div>

              <div className={styles.runtimeGrid}>
                {runtimeSummary.map((item) => (
                  <div className={styles.runtimeMetric} key={item.label}>
                    <div className={styles.runtimeMetricLabel}>{item.label}</div>
                    <div className={styles.runtimeMetricValue}>{item.value}</div>
                    <div className={styles.channelHint}>{item.hint}</div>
                  </div>
                ))}
              </div>

              <div className={styles.channelList}>
                {(snapshot?.channels ?? []).map((channel) => (
                  <div className={styles.channelRow} key={channel.id}>
                    <div className={styles.channelMeta}>
                      <div className={styles.channelName}>{channel.id}</div>
                      <div className={styles.channelHint}>
                        {channel.frameCount} frames • {channel.fps} fps
                      </div>
                    </div>
                    <span className={`${styles.statusPill} ${statusClass(channel.status)}`}>
                      {channel.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Capability Matrix</h2>
                  <p className={styles.cardCopy}>
                    Probe browser features without acquiring permissions. The
                    main example stays low-friction and uses capabilities as
                    visible negotiation signals.
                  </p>
                </div>
              </div>

              <div className={styles.capabilityList}>
                {capabilities.map((capability) => (
                  <div className={styles.capabilityRow} key={capability.id}>
                    <div className={styles.capabilityMeta}>
                      <div className={styles.capabilityLabel}>{capability.label}</div>
                      <div className={styles.capabilityHint}>
                        {capability.description}
                      </div>
                    </div>
                    <div className={styles.depthControl}>
                      <span
                        className={`${styles.capabilityTag} ${capabilityClass(
                          capability.status,
                        )}`}
                      >
                        {capability.status}
                      </span>
                      <span
                        className={`${styles.capabilityTag} ${
                          capability.usedByDemo ? styles.usedBadge : styles.notUsedBadge
                        }`}
                      >
                        {capability.usedByDemo ? 'used' : 'not used'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Frame Timeline</h2>
                  <p className={styles.cardCopy}>
                    Inspect the current agent stream as frame types instead of
                    only reading the rendered text.
                  </p>
                </div>
              </div>

              {streamFrames.length === 0 ? (
                <div className={styles.emptyState}>
                  Run a scenario to watch `delta`, `done`, and error frames
                  appear here in real time.
                </div>
              ) : (
                <div className={styles.frameList}>
                  {streamFrames.slice(-8).map((frame, index) => (
                    <div className={styles.frameRow} key={`${frame.type}-${index}`}>
                      <span className={styles.frameType}>{frame.type}</span>
                      <span className={styles.logDetail}>
                        {frame.type === 'delta'
                          ? clip(frame.content ?? '')
                          : frame.type === 'done'
                            ? frame.finishReason ?? 'stop'
                            : frame.type === 'error'
                              ? clip(String(frame.error))
                              : 'structured frame'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Lab Event Log</h2>
                  <p className={styles.cardCopy}>
                    A compact timeline that binds UI actions, gestures, and
                    runtime state changes together.
                  </p>
                </div>
                <button
                  className={`${styles.devtoolsButton} ${styles.secondaryButton}`}
                  onClick={() => setEventLog([])}
                  type="button"
                >
                  Clear log
                </button>
              </div>

              {deferredEventLog.length === 0 ? (
                <div className={styles.emptyState}>
                  Interact with the showcase to populate the event timeline.
                </div>
              ) : (
                <div className={styles.logList}>
                  {deferredEventLog.map((entry) => (
                    <div
                      className={`${styles.logRow} ${logToneClass(entry.tone)}`}
                      key={entry.id}
                    >
                      <div>
                        <div className={styles.logTitle}>{entry.title}</div>
                        <div className={styles.logDetail}>{entry.detail}</div>
                      </div>
                      <div className={styles.logTime}>{entry.at}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
