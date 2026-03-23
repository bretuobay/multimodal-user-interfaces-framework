/**
 * Built-in policy implementations.
 */

import type { Policy, PolicyContext, PolicyDecision } from './types.js';

// ---------------------------------------------------------------------------
// PermissionPolicy — requires a specific capability to be available
// ---------------------------------------------------------------------------

export interface PermissionPolicyOptions {
  id?: string;
  priority?: number;
  /** Capability IDs that must be present for this policy to allow */
  requiredCapabilities: string[];
  /** Called to check if a capability is currently available */
  checkCapability: (capabilityId: string) => boolean | Promise<boolean>;
}

export class PermissionPolicy implements Policy {
  readonly id: string;
  readonly priority: number;
  readonly requiredCapabilities: string[];
  private readonly _check: (id: string) => boolean | Promise<boolean>;

  constructor(options: PermissionPolicyOptions) {
    this.id = options.id ?? `permission-policy-${Math.random().toString(36).slice(2)}`;
    this.priority = options.priority ?? 10;
    this.requiredCapabilities = options.requiredCapabilities;
    this._check = options.checkCapability;
  }

  async evaluate(context: PolicyContext): Promise<PolicyDecision> {
    // If a specific capability is being accessed, only check that one
    const toCheck = context.capabilityId
      ? this.requiredCapabilities.filter((c) => c === context.capabilityId)
      : this.requiredCapabilities;

    for (const capId of toCheck) {
      const result = this._check(capId);
      const ok = result instanceof Promise ? await result : result;
      if (!ok) return 'deny';
    }
    return 'allow';
  }
}

// ---------------------------------------------------------------------------
// ConcurrencyPolicy — limit simultaneous operations
// ---------------------------------------------------------------------------

export interface ConcurrencyPolicyOptions {
  id?: string;
  priority?: number;
  maxConcurrent: number;
  /** If true, excess requests are throttled (queued); if false, they are denied */
  queueExcess?: boolean;
}

export class ConcurrencyPolicy implements Policy {
  readonly id: string;
  readonly priority: number;
  readonly maxConcurrent: number;
  readonly queueExcess: boolean;
  private _running = 0;

  constructor(options: ConcurrencyPolicyOptions) {
    this.id = options.id ?? `concurrency-policy-${Math.random().toString(36).slice(2)}`;
    this.priority = options.priority ?? 5;
    this.maxConcurrent = options.maxConcurrent;
    this.queueExcess = options.queueExcess ?? false;
  }

  evaluate(_context: PolicyContext): PolicyDecision {
    if (this._running < this.maxConcurrent) {
      return 'allow';
    }
    return this.queueExcess ? 'throttle' : 'deny';
  }

  /** Call when an operation starts */
  acquire(): void {
    this._running++;
  }

  /** Call when an operation completes */
  release(): void {
    this._running = Math.max(0, this._running - 1);
  }

  get running(): number {
    return this._running;
  }
}

// ---------------------------------------------------------------------------
// RateLimitPolicy — limit requests per time window
// ---------------------------------------------------------------------------

export interface RateLimitPolicyOptions {
  id?: string;
  priority?: number;
  maxRequests: number;
  windowMs: number;
}

export class RateLimitPolicy implements Policy {
  readonly id: string;
  readonly priority: number;
  readonly maxRequests: number;
  readonly windowMs: number;
  private _timestamps: number[] = [];

  constructor(options: RateLimitPolicyOptions) {
    this.id = options.id ?? `rate-limit-policy-${Math.random().toString(36).slice(2)}`;
    this.priority = options.priority ?? 8;
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  evaluate(_context: PolicyContext): PolicyDecision {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    // Evict old timestamps
    this._timestamps = this._timestamps.filter((t) => t > windowStart);

    if (this._timestamps.length >= this.maxRequests) {
      return 'deny';
    }
    this._timestamps.push(now);
    return 'allow';
  }

  reset(): void {
    this._timestamps = [];
  }
}

// ---------------------------------------------------------------------------
// ComposedPolicy — AND/OR composition of multiple policies
// ---------------------------------------------------------------------------

export type CompositionMode = 'all-allow' | 'any-allow';

export class ComposedPolicy implements Policy {
  readonly id: string;
  readonly priority: number;
  private readonly _policies: Policy[];
  private readonly _mode: CompositionMode;

  constructor(
    id: string,
    policies: Policy[],
    mode: CompositionMode = 'all-allow',
    priority = 1,
  ) {
    this.id = id;
    this.priority = priority;
    this._policies = policies;
    this._mode = mode;
  }

  async evaluate(context: PolicyContext): Promise<PolicyDecision> {
    const decisions = await Promise.all(
      this._policies.map((p) => {
        const result = p.evaluate(context);
        return result instanceof Promise ? result : Promise.resolve(result);
      }),
    );

    if (this._mode === 'all-allow') {
      // All must allow
      if (decisions.some((d) => d === 'deny')) return 'deny';
      if (decisions.some((d) => d === 'throttle')) return 'throttle';
      return 'allow';
    } else {
      // Any allow is enough
      if (decisions.some((d) => d === 'allow')) return 'allow';
      if (decisions.some((d) => d === 'throttle')) return 'throttle';
      return 'deny';
    }
  }
}
