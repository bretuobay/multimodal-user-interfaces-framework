import type {
  CapabilityDescriptor,
  CapabilityRegistry,
  CapabilitySet,
  CapabilityStatus,
  NegotiationResult,
} from './types.js';

class CapabilitySetImpl implements CapabilitySet {
  private readonly _statuses = new Map<string, CapabilityStatus>();

  constructor(
    private readonly _registry: CapabilityRegistryImpl,
    private readonly _ids: string[],
  ) {
    for (const id of _ids) {
      this._statuses.set(id, 'unknown');
    }
  }

  has(id: string): boolean {
    return this._ids.includes(id);
  }

  get<T = unknown>(id: string): CapabilityDescriptor<T> | undefined {
    if (!this.has(id)) return undefined;
    return this._registry.get<T>(id);
  }

  getStatus(id: string): CapabilityStatus {
    return this._statuses.get(id) ?? 'unknown';
  }

  async negotiate<T = unknown>(id: string): Promise<NegotiationResult<T>> {
    const result = await this._registry.negotiate<T>(id);
    this._statuses.set(id, result.status);
    return result;
  }

  ids(): string[] {
    return [...this._ids];
  }
}

export class CapabilityRegistryImpl implements CapabilityRegistry {
  private readonly _descriptors = new Map<
    string,
    CapabilityDescriptor<unknown>
  >();
  private readonly _statusCache = new Map<string, CapabilityStatus>();

  register<T>(descriptor: CapabilityDescriptor<T>): void {
    this._descriptors.set(descriptor.id, descriptor as CapabilityDescriptor<unknown>);
    // Invalidate cache when re-registering
    this._statusCache.delete(descriptor.id);
  }

  deregister(id: string): void {
    this._descriptors.delete(id);
    this._statusCache.delete(id);
  }

  has(id: string): boolean {
    return this._descriptors.has(id);
  }

  get<T = unknown>(id: string): CapabilityDescriptor<T> | undefined {
    return this._descriptors.get(id) as CapabilityDescriptor<T> | undefined;
  }

  async probe(id: string): Promise<CapabilityStatus> {
    const cached = this._statusCache.get(id);
    if (cached !== undefined && cached !== 'unknown') return cached;

    const descriptor = this._descriptors.get(id);
    if (!descriptor) return 'unavailable';

    try {
      const status = await descriptor.probe();
      this._statusCache.set(id, status);
      return status;
    } catch {
      this._statusCache.set(id, 'unavailable');
      return 'unavailable';
    }
  }

  async probeAll(): Promise<Map<string, CapabilityStatus>> {
    const results = new Map<string, CapabilityStatus>();
    await Promise.all(
      Array.from(this._descriptors.keys()).map(async (id) => {
        results.set(id, await this.probe(id));
      }),
    );
    return results;
  }

  async negotiate<T = unknown>(id: string): Promise<NegotiationResult<T>> {
    const descriptor = this._descriptors.get(id);
    if (!descriptor) {
      return { descriptor: createUnavailableDescriptor(id) as CapabilityDescriptor<T>, status: 'unavailable' };
    }

    // Try the primary descriptor
    const status = await this.probe(id);
    if (status === 'available') {
      return { descriptor: descriptor as CapabilityDescriptor<T>, status };
    }

    // Try fallbacks in order
    for (const fallback of descriptor.fallbacks) {
      // Register fallback if not already registered
      if (!this._descriptors.has(fallback.id)) {
        this.register(fallback);
      }
      const fallbackStatus = await this.probe(fallback.id);
      if (fallbackStatus === 'available' || fallbackStatus === 'degraded') {
        return { descriptor: fallback as CapabilityDescriptor<T>, status: fallbackStatus };
      }
    }

    // Return primary with its actual status (unavailable/denied/degraded)
    return { descriptor: descriptor as CapabilityDescriptor<T>, status };
  }

  createSet(ids: string[]): CapabilitySet {
    return new CapabilitySetImpl(this, ids);
  }

  /** Clear the probe cache (useful in tests) */
  clearCache(): void {
    this._statusCache.clear();
  }
}

function createUnavailableDescriptor(id: string): CapabilityDescriptor<never> {
  return {
    id,
    description: `Unknown capability: ${id}`,
    probe: async () => 'unavailable',
    acquire: async () => { throw new Error(`Capability "${id}" is not registered`); },
    release: async () => {},
    fallbacks: [],
  };
}

/** Create a new CapabilityRegistry */
export function createCapabilityRegistry(): CapabilityRegistry {
  return new CapabilityRegistryImpl();
}
