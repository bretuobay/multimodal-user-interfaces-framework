/**
 * EventBus — typed internal pub/sub used by Session and Modalities.
 * Does not use DOM EventTarget; pure TS.
 */

type Handler<T> = (event: T) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class EventBus<EventMap extends Record<string, any>> {
  private readonly _handlers = new Map<
    keyof EventMap,
    Set<Handler<unknown>>
  >();

  on<K extends keyof EventMap>(
    event: K,
    handler: Handler<EventMap[K]>,
  ): () => void {
    let set = this._handlers.get(event);
    if (!set) {
      set = new Set();
      this._handlers.set(event, set);
    }
    set.add(handler as Handler<unknown>);
    return () => this.off(event, handler);
  }

  off<K extends keyof EventMap>(
    event: K,
    handler: Handler<EventMap[K]>,
  ): void {
    this._handlers.get(event)?.delete(handler as Handler<unknown>);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const handlers = this._handlers.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch {
        // swallow handler errors
      }
    }
  }

  once<K extends keyof EventMap>(
    event: K,
    handler: Handler<EventMap[K]>,
  ): () => void {
    const wrapped: Handler<EventMap[K]> = (payload) => {
      handler(payload);
      this.off(event, wrapped);
    };
    return this.on(event, wrapped);
  }

  clear(): void {
    this._handlers.clear();
  }
}
