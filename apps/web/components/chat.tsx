'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createAgentChannel } from '@muix/agent';
import { SessionProvider, useSession, useAgent } from '@muix/react';

// Create a single channel instance outside the component (per-app lifetime)
const agentChannel = createAgentChannel({ endpoint: '/api/chat' });

function ChatInterface() {
  const session = useSession();
  const { send, history, streamingText, isStreaming, cancel, clear, error } =
    useAgent({ channel: agentChannel });
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Open the channel when session starts
  useEffect(() => {
    if (session.status.value === 'active') {
      agentChannel.open().catch(() => {});
    }
  }, [session]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, streamingText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    send({ role: 'user', content: input.trim() });
    setInput('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>MUIX Chat Demo</h1>
        <p style={styles.subtitle}>
          Streaming via <code>AgentChannel</code> + <code>useAgent</code>
        </p>
      </div>

      <div style={styles.messages}>
        {history.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.message,
              ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
            }}
          >
            <span style={styles.role}>{msg.role === 'user' ? 'You' : 'Assistant'}</span>
            <p style={styles.messageText}>
              {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
            </p>
          </div>
        ))}

        {isStreaming && (
          <div style={{ ...styles.message, ...styles.assistantMessage }}>
            <span style={styles.role}>Assistant</span>
            <p style={styles.messageText}>
              {streamingText}
              <span style={styles.cursor}>▋</span>
            </p>
          </div>
        )}

        {error != null && (
          <div style={styles.error}>
            Error: {String(error)}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about MUIX..."
          disabled={isStreaming}
        />
        <button style={styles.button} type="submit" disabled={isStreaming || !input.trim()}>
          Send
        </button>
        {isStreaming && (
          <button style={{ ...styles.button, ...styles.cancelButton }} type="button" onClick={cancel}>
            Cancel
          </button>
        )}
        <button style={{ ...styles.button, ...styles.clearButton }} type="button" onClick={clear}>
          Clear
        </button>
      </form>
    </div>
  );
}

export function Chat() {
  return (
    <SessionProvider>
      <ChatInterface />
    </SessionProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    maxWidth: 800,
    margin: '0 auto',
    fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
  },
  header: {
    padding: '24px 24px 12px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: '#111827',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 13,
    color: '#6b7280',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  message: {
    borderRadius: 8,
    padding: '10px 14px',
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    background: '#3b82f6',
    color: '#fff',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    background: '#f3f4f6',
    color: '#111827',
  },
  role: {
    fontSize: 11,
    fontWeight: 600,
    opacity: 0.7,
    display: 'block',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  messageText: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.6,
  },
  cursor: {
    animation: 'blink 1s step-end infinite',
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
  },
  form: {
    display: 'flex',
    gap: 8,
    padding: '12px 24px 24px',
    borderTop: '1px solid #e5e7eb',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: 15,
    outline: 'none',
  },
  button: {
    padding: '10px 18px',
    borderRadius: 8,
    border: 'none',
    background: '#3b82f6',
    color: '#fff',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  },
  cancelButton: {
    background: '#ef4444',
  },
  clearButton: {
    background: '#6b7280',
  },
};
