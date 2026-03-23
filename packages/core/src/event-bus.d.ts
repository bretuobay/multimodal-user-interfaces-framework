/**
 * EventBus — typed internal pub/sub used by Session and Modalities.
 * Does not use DOM EventTarget; pure TS.
 */
type Handler<T> = (event: T) => void;
export declare class EventBus<EventMap extends Record<string, unknown>> {
    private readonly _handlers;
    on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): () => void;
    off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void;
    emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void;
    once<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): () => void;
    clear(): void;
}
export {};
//# sourceMappingURL=event-bus.d.ts.map