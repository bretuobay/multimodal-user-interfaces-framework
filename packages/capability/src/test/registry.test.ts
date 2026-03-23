import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCapabilityRegistry } from '../registry.js';
import type { CapabilityDescriptor } from '../types.js';

function makeDescriptor(
  id: string,
  status: 'available' | 'unavailable' | 'degraded' = 'available',
  fallbacks: CapabilityDescriptor[] = [],
): CapabilityDescriptor<string> {
  return {
    id,
    description: `Test capability ${id}`,
    probe: vi.fn().mockResolvedValue(status),
    acquire: vi.fn().mockResolvedValue(`handle:${id}`),
    release: vi.fn().mockResolvedValue(undefined),
    fallbacks,
  };
}

describe('CapabilityRegistry', () => {
  let registry: ReturnType<typeof createCapabilityRegistry>;

  beforeEach(() => {
    registry = createCapabilityRegistry();
  });

  it('registers and retrieves a capability', () => {
    const desc = makeDescriptor('test:a');
    registry.register(desc);
    expect(registry.has('test:a')).toBe(true);
    expect(registry.get('test:a')).toBe(desc);
  });

  it('deregisters a capability', () => {
    registry.register(makeDescriptor('test:a'));
    registry.deregister('test:a');
    expect(registry.has('test:a')).toBe(false);
  });

  it('probe() returns available for a registered available capability', async () => {
    registry.register(makeDescriptor('test:a', 'available'));
    const status = await registry.probe('test:a');
    expect(status).toBe('available');
  });

  it('probe() returns unavailable for unknown capability', async () => {
    const status = await registry.probe('nonexistent');
    expect(status).toBe('unavailable');
  });

  it('probe() caches results', async () => {
    const desc = makeDescriptor('test:a', 'available');
    registry.register(desc);
    await registry.probe('test:a');
    await registry.probe('test:a');
    // probe fn called only once (cached on second call)
    expect(desc.probe).toHaveBeenCalledOnce();
  });

  it('probeAll() returns statuses for all registered capabilities', async () => {
    registry.register(makeDescriptor('a', 'available'));
    registry.register(makeDescriptor('b', 'unavailable'));
    const results = await registry.probeAll();
    expect(results.get('a')).toBe('available');
    expect(results.get('b')).toBe('unavailable');
  });

  it('negotiate() returns the primary descriptor if available', async () => {
    const desc = makeDescriptor('primary', 'available');
    registry.register(desc);
    const result = await registry.negotiate('primary');
    expect(result.descriptor).toBe(desc);
    expect(result.status).toBe('available');
  });

  it('negotiate() falls back to first available fallback', async () => {
    const fallback = makeDescriptor('fallback', 'available');
    const primary = makeDescriptor('primary', 'unavailable', [fallback]);
    registry.register(primary);
    const result = await registry.negotiate('primary');
    expect(result.descriptor.id).toBe('fallback');
    expect(result.status).toBe('available');
  });

  it('negotiate() returns primary with unavailable status if all fallbacks fail', async () => {
    const fallback = makeDescriptor('fb', 'unavailable');
    const primary = makeDescriptor('primary', 'unavailable', [fallback]);
    registry.register(primary);
    const result = await registry.negotiate('primary');
    expect(result.status).toBe('unavailable');
  });

  it('negotiate() returns unavailable for unregistered capability', async () => {
    const result = await registry.negotiate('ghost');
    expect(result.status).toBe('unavailable');
  });

  it('createSet() returns a CapabilitySet with the given IDs', () => {
    registry.register(makeDescriptor('a'));
    registry.register(makeDescriptor('b'));
    const set = registry.createSet(['a', 'b']);
    expect(set.has('a')).toBe(true);
    expect(set.has('b')).toBe(true);
    expect(set.has('c')).toBe(false);
  });

  it('CapabilitySet.negotiate() delegates to registry', async () => {
    const desc = makeDescriptor('cap', 'available');
    registry.register(desc);
    const set = registry.createSet(['cap']);
    const result = await set.negotiate('cap');
    expect(result.status).toBe('available');
  });

  it('CapabilitySet.getStatus() returns unknown before negotiation', () => {
    registry.register(makeDescriptor('cap'));
    const set = registry.createSet(['cap']);
    expect(set.getStatus('cap')).toBe('unknown');
  });

  it('CapabilitySet.getStatus() reflects negotiated status', async () => {
    registry.register(makeDescriptor('cap', 'available'));
    const set = registry.createSet(['cap']);
    await set.negotiate('cap');
    expect(set.getStatus('cap')).toBe('available');
  });
});
