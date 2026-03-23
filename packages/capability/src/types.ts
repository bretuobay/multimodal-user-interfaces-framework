/**
 * Core capability types — browser feature negotiation with graceful degradation.
 */

export type CapabilityStatus =
  | 'unknown'
  | 'available'
  | 'unavailable'
  | 'degraded'
  | 'denied';

export interface CapabilityDescriptor<T = unknown> {
  /** Unique capability identifier, e.g. "media:microphone" */
  readonly id: string;
  /** Human-readable description */
  readonly description: string;
  /**
   * Probe whether the capability is available on this device/browser.
   * Must not request user permissions — only detect presence.
   */
  probe(): Promise<CapabilityStatus>;
  /**
   * Acquire the capability (may prompt for permissions).
   * Returns the native API handle (e.g. MediaStream, SpeechSynthesis).
   */
  acquire(): Promise<T>;
  /** Release a previously acquired handle */
  release(handle: T): Promise<void>;
  /** Ordered fallback capabilities to try if this one is unavailable */
  readonly fallbacks: ReadonlyArray<CapabilityDescriptor<T>>;
}

export interface NegotiationResult<T = unknown> {
  readonly descriptor: CapabilityDescriptor<T>;
  readonly status: CapabilityStatus;
}

export interface CapabilitySet {
  has(id: string): boolean;
  get<T = unknown>(id: string): CapabilityDescriptor<T> | undefined;
  getStatus(id: string): CapabilityStatus;
  negotiate<T = unknown>(id: string): Promise<NegotiationResult<T>>;
  ids(): string[];
}

export interface CapabilityRegistry {
  register<T>(descriptor: CapabilityDescriptor<T>): void;
  deregister(id: string): void;
  has(id: string): boolean;
  get<T = unknown>(id: string): CapabilityDescriptor<T> | undefined;
  probe(id: string): Promise<CapabilityStatus>;
  probeAll(): Promise<Map<string, CapabilityStatus>>;
  /**
   * Negotiate a capability: try it and its fallbacks in order.
   * Returns the first available descriptor, or the last degraded/unavailable.
   */
  negotiate<T = unknown>(id: string): Promise<NegotiationResult<T>>;
  /** Create an immutable CapabilitySet from a list of capability IDs */
  createSet(ids: string[]): CapabilitySet;
}
