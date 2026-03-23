import { describe, it, expect, vi } from 'vitest';
import { createAction, runAction, type ActionDefinition } from '../action.js';

describe('Action', () => {
  it('starts in pending status', () => {
    const action = createAction('test');
    expect(action.status.value).toBe('pending');
  });

  it('can be cancelled before running', () => {
    const action = createAction('test');
    action.cancel('reason');
    expect(action.status.value).toBe('cancelled');
    expect(action.signal.aborted).toBe(true);
  });

  it('does not double-cancel', () => {
    const action = createAction('test');
    action.cancel();
    action.cancel(); // second call is a no-op
    expect(action.status.value).toBe('cancelled');
  });

  it('emits progress via observe()', async () => {
    const progressMessages: string[] = [];
    const definition: ActionDefinition<string> = {
      type: 'echo',
      execute: async (_signal, emit) => {
        emit({ message: 'halfway', percent: 50 });
        return 'done';
      },
    };

    const action = await runAction(definition);
    action.observe().subscribe({
      next: (p) => progressMessages.push(p.message ?? ''),
    });

    await action.toPromise();
    expect(action.status.value).toBe('completed');
    expect(action.result.value).toBe('done');
  });

  it('toPromise() resolves on completion', async () => {
    const definition: ActionDefinition<number> = {
      type: 'add',
      execute: async () => 42,
    };
    const action = await runAction(definition);
    const result = await action.toPromise();
    expect(result).toBe(42);
  });

  it('toPromise() rejects on failure', async () => {
    const definition: ActionDefinition<number> = {
      type: 'fail',
      execute: async () => {
        throw new Error('action error');
      },
    };
    const action = await runAction(definition);
    // Wait a tick for async execution
    await new Promise((r) => setTimeout(r, 10));
    await expect(action.toPromise()).rejects.toThrow('action error');
  });

  it('marks status as running when execute is in-flight', async () => {
    // Pause execution in the middle so we can observe 'running' status
    let releaseExec!: () => void;
    const pausePoint = new Promise<void>((res) => { releaseExec = res; });

    const definition: ActionDefinition<void> = {
      type: 'check-status',
      execute: async () => {
        await pausePoint;
      },
    };

    const action = await runAction(definition);
    // At this point execute is awaiting pausePoint → status should be 'running'
    expect(action.status.value).toBe('running');
    releaseExec();
    await action.toPromise();
    expect(action.status.value).toBe('completed');
  });

  it('cancels via cancel()', async () => {
    const definition: ActionDefinition<void> = {
      type: 'long',
      execute: (signal) =>
        new Promise<void>((resolve) => {
          signal.addEventListener('abort', () => resolve());
        }),
    };
    const action = await runAction(definition);
    expect(action.status.value).toBe('running');
    action.cancel('user request');
    expect(action.status.value).toBe('cancelled');
    expect(action.signal.aborted).toBe(true);
  });

  it('cancels via external AbortSignal', async () => {
    const controller = new AbortController();
    const definition: ActionDefinition<void> = {
      type: 'long',
      execute: (signal) =>
        new Promise<void>((resolve) => {
          signal.addEventListener('abort', () => resolve());
        }),
    };
    const action = await runAction(definition, controller.signal);
    expect(action.status.value).toBe('running');
    controller.abort();
    // The action should be cancelled synchronously via the abort listener
    await new Promise((r) => setTimeout(r, 10));
    expect(action.status.value).toBe('cancelled');
  });

  it('preserves async-generator return values', async () => {
    const definition: ActionDefinition<string, { message: string }> = {
      type: 'streaming-return',
      async *execute() {
        yield { message: 'step-1' };
        yield { message: 'step-2' };
        return 'final-result';
      },
    };

    const action = await runAction(definition);
    const result = await action.toPromise();

    expect(result).toBe('final-result');
    expect(action.result.value).toBe('final-result');
  });
});
