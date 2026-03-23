import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPolicySet } from '../engine.js';
import {
  PermissionPolicy,
  ConcurrencyPolicy,
  RateLimitPolicy,
  ComposedPolicy,
} from '../policies.js';
import type { PolicyContext } from '../types.js';

const ctx: PolicyContext = {};

describe('PolicySet', () => {
  it('allows by default (no policies)', async () => {
    const set = createPolicySet();
    expect(await set.evaluate(ctx)).toBe('allow');
  });

  it('denies if any policy denies', async () => {
    const set = createPolicySet();
    set.add({ id: 'deny-all', priority: 1, evaluate: () => 'deny' });
    expect(await set.evaluate(ctx)).toBe('deny');
  });

  it('throttles if a policy throttles (no denies)', async () => {
    const set = createPolicySet();
    set.add({ id: 'throttle', priority: 1, evaluate: () => 'throttle' });
    expect(await set.evaluate(ctx)).toBe('throttle');
  });

  it('deny takes precedence over throttle', async () => {
    const set = createPolicySet();
    set.add({ id: 'deny', priority: 2, evaluate: () => 'deny' });
    set.add({ id: 'throttle', priority: 1, evaluate: () => 'throttle' });
    expect(await set.evaluate(ctx)).toBe('deny');
  });

  it('can remove a policy', async () => {
    const set = createPolicySet();
    set.add({ id: 'deny-all', priority: 1, evaluate: () => 'deny' });
    set.remove('deny-all');
    expect(await set.evaluate(ctx)).toBe('allow');
  });

  it('evaluateAll returns results for each policy', async () => {
    const set = createPolicySet();
    set.add({ id: 'a', priority: 1, evaluate: () => 'allow' });
    set.add({ id: 'b', priority: 2, evaluate: () => 'deny' });
    const results = await set.evaluateAll(ctx);
    expect(results).toHaveLength(2);
    expect(results.some((r) => r.policy.id === 'b' && r.decision === 'deny')).toBe(true);
  });

  it('higher priority policies are evaluated first', async () => {
    const order: number[] = [];
    const set = createPolicySet();
    set.add({ id: 'low', priority: 1, evaluate: () => { order.push(1); return 'allow'; } });
    set.add({ id: 'high', priority: 10, evaluate: () => { order.push(10); return 'allow'; } });
    await set.evaluateAll(ctx);
    expect(order[0]).toBe(10);
  });
});

describe('PermissionPolicy', () => {
  it('allows when all capabilities are available', async () => {
    const policy = new PermissionPolicy({
      requiredCapabilities: ['cap:a', 'cap:b'],
      checkCapability: () => true,
    });
    expect(await policy.evaluate(ctx)).toBe('allow');
  });

  it('denies when a capability is unavailable', async () => {
    const policy = new PermissionPolicy({
      requiredCapabilities: ['cap:a'],
      checkCapability: () => false,
    });
    expect(await policy.evaluate(ctx)).toBe('deny');
  });

  it('supports async checkCapability', async () => {
    const policy = new PermissionPolicy({
      requiredCapabilities: ['cap:a'],
      checkCapability: () => Promise.resolve(true),
    });
    expect(await policy.evaluate(ctx)).toBe('allow');
  });

  it('only checks the relevant capability when context.capabilityId is set', async () => {
    const check = vi.fn().mockReturnValue(true);
    const policy = new PermissionPolicy({
      requiredCapabilities: ['cap:a', 'cap:b'],
      checkCapability: check,
    });
    await policy.evaluate({ capabilityId: 'cap:a' });
    expect(check).toHaveBeenCalledOnce(); // only cap:a checked
  });
});

describe('ConcurrencyPolicy', () => {
  it('allows when under limit', () => {
    const policy = new ConcurrencyPolicy({ maxConcurrent: 2 });
    expect(policy.evaluate(ctx)).toBe('allow');
  });

  it('denies when at limit (queueExcess: false)', () => {
    const policy = new ConcurrencyPolicy({ maxConcurrent: 1, queueExcess: false });
    policy.acquire();
    expect(policy.evaluate(ctx)).toBe('deny');
  });

  it('throttles when at limit (queueExcess: true)', () => {
    const policy = new ConcurrencyPolicy({ maxConcurrent: 1, queueExcess: true });
    policy.acquire();
    expect(policy.evaluate(ctx)).toBe('throttle');
  });

  it('allows again after release', () => {
    const policy = new ConcurrencyPolicy({ maxConcurrent: 1 });
    policy.acquire();
    policy.release();
    expect(policy.evaluate(ctx)).toBe('allow');
  });

  it('does not go below 0 on release', () => {
    const policy = new ConcurrencyPolicy({ maxConcurrent: 1 });
    policy.release(); // should not throw or go negative
    expect(policy.running).toBe(0);
  });
});

describe('RateLimitPolicy', () => {
  it('allows requests within limit', () => {
    const policy = new RateLimitPolicy({ maxRequests: 3, windowMs: 1000 });
    expect(policy.evaluate(ctx)).toBe('allow');
    expect(policy.evaluate(ctx)).toBe('allow');
    expect(policy.evaluate(ctx)).toBe('allow');
  });

  it('denies when limit exceeded', () => {
    const policy = new RateLimitPolicy({ maxRequests: 2, windowMs: 1000 });
    policy.evaluate(ctx);
    policy.evaluate(ctx);
    expect(policy.evaluate(ctx)).toBe('deny');
  });

  it('resets the counter', () => {
    const policy = new RateLimitPolicy({ maxRequests: 1, windowMs: 1000 });
    policy.evaluate(ctx);
    policy.reset();
    expect(policy.evaluate(ctx)).toBe('allow');
  });
});

describe('ComposedPolicy', () => {
  it('all-allow: allows when all sub-policies allow', async () => {
    const policy = new ComposedPolicy('composed', [
      { id: 'a', priority: 1, evaluate: () => 'allow' },
      { id: 'b', priority: 1, evaluate: () => 'allow' },
    ]);
    expect(await policy.evaluate(ctx)).toBe('allow');
  });

  it('all-allow: denies if any sub-policy denies', async () => {
    const policy = new ComposedPolicy('composed', [
      { id: 'a', priority: 1, evaluate: () => 'allow' },
      { id: 'b', priority: 1, evaluate: () => 'deny' },
    ]);
    expect(await policy.evaluate(ctx)).toBe('deny');
  });

  it('any-allow: allows if any sub-policy allows', async () => {
    const policy = new ComposedPolicy(
      'composed',
      [
        { id: 'a', priority: 1, evaluate: () => 'deny' },
        { id: 'b', priority: 1, evaluate: () => 'allow' },
      ],
      'any-allow',
    );
    expect(await policy.evaluate(ctx)).toBe('allow');
  });

  it('any-allow: denies if all sub-policies deny', async () => {
    const policy = new ComposedPolicy(
      'composed',
      [
        { id: 'a', priority: 1, evaluate: () => 'deny' },
        { id: 'b', priority: 1, evaluate: () => 'deny' },
      ],
      'any-allow',
    );
    expect(await policy.evaluate(ctx)).toBe('deny');
  });
});
