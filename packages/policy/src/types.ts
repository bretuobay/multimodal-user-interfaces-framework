/**
 * Policy system types.
 * Policies are composable rules governing permissions, concurrency, and rate limits.
 */

export type PolicyDecision = 'allow' | 'deny' | 'throttle';

export interface PolicyContext {
  /** Arbitrary metadata about the action/channel being evaluated */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** The capability ID being accessed, if relevant */
  readonly capabilityId?: string;
  /** The session ID, if relevant */
  readonly sessionId?: string;
  /** The action type, if relevant */
  readonly actionType?: string;
}

export interface Policy {
  readonly id: string;
  /** Higher priority policies are evaluated first */
  readonly priority: number;
  evaluate(context: PolicyContext): PolicyDecision | Promise<PolicyDecision>;
}

export interface PolicySet {
  add(policy: Policy): void;
  remove(id: string): void;
  has(id: string): boolean;
  /** Evaluate all policies; returns the first non-allow decision or 'allow' if all pass */
  evaluate(context: PolicyContext): Promise<PolicyDecision>;
  /** Evaluate all policies and return each result */
  evaluateAll(context: PolicyContext): Promise<Array<{ policy: Policy; decision: PolicyDecision }>>;
}
