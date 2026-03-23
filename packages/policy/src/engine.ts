import type { Policy, PolicyContext, PolicyDecision, PolicySet } from './types.js';

class PolicySetImpl implements PolicySet {
  private readonly _policies = new Map<string, Policy>();

  add(policy: Policy): void {
    this._policies.set(policy.id, policy);
  }

  remove(id: string): void {
    this._policies.delete(id);
  }

  has(id: string): boolean {
    return this._policies.has(id);
  }

  async evaluate(context: PolicyContext): Promise<PolicyDecision> {
    const results = await this.evaluateAll(context);
    // First deny wins, then throttle, then allow
    for (const { decision } of results) {
      if (decision === 'deny') return 'deny';
    }
    for (const { decision } of results) {
      if (decision === 'throttle') return 'throttle';
    }
    return 'allow';
  }

  async evaluateAll(
    context: PolicyContext,
  ): Promise<Array<{ policy: Policy; decision: PolicyDecision }>> {
    // Sort by priority descending — higher priority evaluated first
    const sorted = Array.from(this._policies.values()).sort(
      (a, b) => b.priority - a.priority,
    );

    const results: Array<{ policy: Policy; decision: PolicyDecision }> = [];
    for (const policy of sorted) {
      const raw = policy.evaluate(context);
      // Sync-first: avoid microtask overhead on hot path
      const decision =
        raw instanceof Promise ? await raw : raw;
      results.push({ policy, decision });
    }
    return results;
  }
}

export function createPolicySet(): PolicySet {
  return new PolicySetImpl();
}
