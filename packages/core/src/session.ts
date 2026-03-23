/**
 * Session — bounded lifecycle container grouping Channels and state.
 * Interruptible, resumable, terminatable.
 */

import { Channel, type ChannelOptions } from './channel.js';
import { Signal, type ReadonlySignal } from './signal.js';
import { EventBus } from './event-bus.js';
import {
  Action,
  createAction,
  type ActionDefinition,
  type ActionStatus,
} from './action.js';

export type SessionStatus =
  | 'created'
  | 'active'
  | 'suspended'
  | 'terminated'
  | 'error';

export interface SessionEventMap {
  'channel:added': { channelId: string };
  'channel:removed': { channelId: string };
  'action:dispatched': { actionId: string; type: string };
  'action:completed': { actionId: string; result: unknown };
  'action:failed': { actionId: string; error: unknown };
  'action:cancelled': { actionId: string };
  'status:changed': { from: SessionStatus; to: SessionStatus };
  error: { error: unknown };
}

export interface SessionOptions {
  id?: string;
  metadata?: Record<string, unknown>;
}

let _sessionCounter = 0;

export class Session {
  readonly id: string;
  readonly metadata: Readonly<Record<string, unknown>>;

  private readonly _status: Signal<SessionStatus>;
  private readonly _state: Signal<Record<string, unknown>>;
  private readonly _channels = new Map<string, Channel<unknown, unknown>>();
  private readonly _actions = new Map<string, Action<unknown>>();
  private readonly _bus: EventBus<SessionEventMap>;

  constructor(options: SessionOptions = {}) {
    this.id = options.id ?? `session-${++_sessionCounter}`;
    this.metadata = Object.freeze(options.metadata ?? {});
    this._status = new Signal<SessionStatus>('created');
    this._state = new Signal<Record<string, unknown>>({});
    this._bus = new EventBus<SessionEventMap>();
  }

  get status(): ReadonlySignal<SessionStatus> {
    return this._status;
  }

  get state(): Signal<Record<string, unknown>> {
    return this._state;
  }

  // --- Lifecycle ---

  async start(): Promise<void> {
    if (this._status.value !== 'created' && this._status.value !== 'suspended')
      return;
    this._transition('active');
    // Open all channels that are idle
    for (const channel of this._channels.values()) {
      if (channel.status.value === 'idle') {
        await channel.open();
      }
    }
  }

  async suspend(): Promise<void> {
    if (this._status.value !== 'active') return;
    this._transition('suspended');
    for (const channel of this._channels.values()) {
      channel.pause();
    }
  }

  async resume(): Promise<void> {
    if (this._status.value !== 'suspended') return;
    this._transition('active');
    for (const channel of this._channels.values()) {
      channel.resume();
    }
  }

  async terminate(reason?: string): Promise<void> {
    if (
      this._status.value === 'terminated' ||
      this._status.value === 'error'
    ) {
      return;
    }

    // Cancel all running actions
    for (const action of this._actions.values()) {
      const s = action.status.value;
      if (s === 'pending' || s === 'running') {
        action.cancel(reason ?? 'Session terminated');
      }
    }

    // Close all channels
    for (const channel of this._channels.values()) {
      await channel.close(reason);
    }

    this._transition('terminated');
    this._bus.clear();
  }

  // --- Channel management ---

  addChannel<In, Out = In>(
    id: string,
    options?: ChannelOptions,
  ): Channel<In, Out> {
    if (this._channels.has(id)) {
      throw new Error(`Channel "${id}" already exists in session ${this.id}`);
    }
    const channel = new Channel<In, Out>({ ...options, id });
    this._channels.set(id, channel as Channel<unknown, unknown>);
    this._bus.emit('channel:added', { channelId: id });

    if (this._status.value === 'active') {
      channel.open().catch((e: unknown) => {
        this._bus.emit('error', { error: e });
      });
    }

    return channel;
  }

  getChannel<In, Out = In>(id: string): Channel<In, Out> | undefined {
    return this._channels.get(id) as Channel<In, Out> | undefined;
  }

  async removeChannel(id: string): Promise<void> {
    const channel = this._channels.get(id);
    if (!channel) return;
    await channel.close();
    this._channels.delete(id);
    this._bus.emit('channel:removed', { channelId: id });
  }

  get channelIds(): string[] {
    return Array.from(this._channels.keys());
  }

  // --- Action management ---

  dispatch<T>(definition: ActionDefinition<T>): Action<T> {
    const action = createAction<T>(definition.type);
    this._actions.set(action.id, action as Action<unknown>);

    this._bus.emit('action:dispatched', {
      actionId: action.id,
      type: definition.type,
    });

    // Run the action
    action._setRunning();
    (async () => {
      try {
        const resultOrGen = definition.execute(action.signal, (p) =>
          action._emitProgress(p),
        );

        let result: T;
        if (
          resultOrGen !== null &&
          typeof resultOrGen === 'object' &&
          Symbol.asyncIterator in resultOrGen
        ) {
          const gen = resultOrGen as AsyncGenerator<unknown, T>;
          for await (const progress of gen) {
            if (action.signal.aborted) break;
            action._emitProgress(progress as { partial?: T });
          }
          const ret = await gen.return(undefined as unknown as T);
          result = ret.value as unknown as T;
        } else {
          result = await (resultOrGen as Promise<T>);
        }

        if (!action.signal.aborted) {
          action._setCompleted(result);
          this._bus.emit('action:completed', {
            actionId: action.id,
            result,
          });
        } else {
          this._bus.emit('action:cancelled', { actionId: action.id });
        }
      } catch (e: unknown) {
        if (!action.signal.aborted) {
          action._setFailed(e);
          this._bus.emit('action:failed', {
            actionId: action.id,
            error: e,
          });
        } else {
          this._bus.emit('action:cancelled', { actionId: action.id });
        }
      } finally {
        this._actions.delete(action.id);
      }
    })();

    return action;
  }

  cancelAction(actionId: string, reason?: string): void {
    this._actions.get(actionId)?.cancel(reason);
  }

  // --- Events ---

  on<K extends keyof SessionEventMap>(
    event: K,
    handler: (payload: SessionEventMap[K]) => void,
  ): () => void {
    return this._bus.on(event, handler);
  }

  once<K extends keyof SessionEventMap>(
    event: K,
    handler: (payload: SessionEventMap[K]) => void,
  ): () => void {
    return this._bus.once(event, handler);
  }

  // --- Internal ---

  private _transition(to: SessionStatus): void {
    const from = this._status.value;
    this._status.set(to);
    this._bus.emit('status:changed', { from, to });
  }
}

/** Factory */
export function createSession(options?: SessionOptions): Session {
  return new Session(options);
}

/** Represents the ActionStatus type for external consumers */
export type { ActionStatus };
