import { describe, it, expect, vi } from 'vitest';
import { createSession, type ActionDefinition } from '../index.js';

describe('Session', () => {
  it('starts in created status', () => {
    const session = createSession();
    expect(session.status.value).toBe('created');
  });

  it('transitions to active on start()', async () => {
    const session = createSession();
    await session.start();
    expect(session.status.value).toBe('active');
  });

  it('transitions to suspended on suspend()', async () => {
    const session = createSession();
    await session.start();
    await session.suspend();
    expect(session.status.value).toBe('suspended');
  });

  it('transitions back to active on resume()', async () => {
    const session = createSession();
    await session.start();
    await session.suspend();
    await session.resume();
    expect(session.status.value).toBe('active');
  });

  it('transitions to terminated on terminate()', async () => {
    const session = createSession();
    await session.start();
    await session.terminate();
    expect(session.status.value).toBe('terminated');
  });

  it('addChannel creates and registers a channel', async () => {
    const session = createSession();
    await session.start();
    const ch = session.addChannel<string>('text');
    expect(ch.id).toBe('text');
    expect(session.channelIds).toContain('text');
  });

  it('throws on duplicate channel id', async () => {
    const session = createSession();
    session.addChannel('ch');
    expect(() => session.addChannel('ch')).toThrow();
  });

  it('removeChannel closes and removes the channel', async () => {
    const session = createSession();
    await session.start();
    session.addChannel('ch');
    await session.removeChannel('ch');
    expect(session.channelIds).not.toContain('ch');
  });

  it('emits status:changed events', async () => {
    const session = createSession();
    const events: string[] = [];
    session.on('status:changed', ({ from, to }) => events.push(`${from}->${to}`));
    await session.start();
    await session.suspend();
    await session.terminate();
    expect(events).toEqual([
      'created->active',
      'active->suspended',
      'suspended->terminated',
    ]);
  });

  it('emits channel:added and channel:removed', async () => {
    const session = createSession();
    const added: string[] = [];
    const removed: string[] = [];
    session.on('channel:added', ({ channelId }) => added.push(channelId));
    session.on('channel:removed', ({ channelId }) => removed.push(channelId));
    session.addChannel('a');
    await session.removeChannel('a');
    expect(added).toContain('a');
    expect(removed).toContain('a');
  });

  it('dispatches and completes an action', async () => {
    const session = createSession();
    await session.start();

    const def: ActionDefinition<number> = {
      type: 'multiply',
      execute: async () => 99,
    };

    const action = session.dispatch(def);
    await action.toPromise();
    expect(action.status.value).toBe('completed');
    expect(action.result.value).toBe(99);
  });

  it('terminate() cancels running actions', async () => {
    const session = createSession();
    await session.start();

    let aborted = false;
    const def: ActionDefinition<void> = {
      type: 'long',
      execute: (signal) =>
        new Promise((resolve) => {
          signal.addEventListener('abort', () => {
            aborted = true;
            resolve();
          });
        }),
    };

    session.dispatch(def);
    await session.terminate('test');
    await new Promise((r) => setTimeout(r, 0));
    expect(aborted).toBe(true);
  });

  it('state signal is writable and reactive', () => {
    const session = createSession();
    const values: Record<string, unknown>[] = [];
    session.state.observe().subscribe({ next: (v) => values.push(v) });
    session.state.set({ count: 1 });
    session.state.update((s) => ({ ...s, count: 2 }));
    expect(values[values.length - 1]).toEqual({ count: 2 });
  });

  it('preserves async-generator return values for dispatched actions', async () => {
    const session = createSession();
    await session.start();

    const def: ActionDefinition<string, { partial: string }> = {
      type: 'streaming-session-action',
      async *execute() {
        yield { partial: 'hello' };
        yield { partial: 'world' };
        return 'done';
      },
    };

    const action = session.dispatch(def);
    const result = await action.toPromise();

    expect(result).toBe('done');
    expect(action.result.value).toBe('done');
  });
});
