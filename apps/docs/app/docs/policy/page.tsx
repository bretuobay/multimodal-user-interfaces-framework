import type { Metadata } from "next";

export const metadata: Metadata = { title: "@muix/policy" };

export default function PolicyPage() {
  return (
    <>
      <h1>@muix/policy</h1>
      <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
        Composable permission, concurrency, and rate-limiting rules.
      </p>

      <h2>PolicyEngine</h2>
      <p>
        Evaluates a set of policies in priority order. The first{" "}
        <code>deny</code> wins; otherwise the first <code>throttle</code> wins;
        otherwise <code>allow</code>.
      </p>
      <pre>{`import { createPolicyEngine } from "@muix/policy";

const engine = createPolicyEngine();
engine.add(rateLimitPolicy);
engine.add(permissionPolicy);

const result = await engine.evaluate({ action: "send-message", session });
if (result.effect === "deny") throw new Error(result.reason);`}</pre>

      <h2>PermissionPolicy</h2>
      <pre>{`import { PermissionPolicy } from "@muix/policy";

const policy = new PermissionPolicy({
  id: "admin-only",
  priority: 100,
  check: async (ctx) => {
    return ctx.session.state.value.role === "admin"
      ? { effect: "allow" }
      : { effect: "deny", reason: "Admin access required" };
  },
});`}</pre>

      <h2>ConcurrencyPolicy</h2>
      <p>
        Limits the number of concurrently running actions. Calls beyond the
        limit are denied until a slot opens via <code>release()</code>.
      </p>
      <pre>{`import { ConcurrencyPolicy } from "@muix/policy";

const policy = new ConcurrencyPolicy({ id: "max-3", maxConcurrent: 3, priority: 50 });

// Manually acquire/release if not using PolicyEngine
const ticket = await policy.acquire();
try {
  await doWork();
} finally {
  policy.release(ticket);
}`}</pre>

      <h2>RateLimitPolicy</h2>
      <p>Sliding-window rate limiter.</p>
      <pre>{`import { RateLimitPolicy } from "@muix/policy";

const policy = new RateLimitPolicy({
  id: "10-per-minute",
  maxRequests: 10,
  windowMs: 60_000,
  priority: 75,
});`}</pre>

      <h2>ComposedPolicy</h2>
      <pre>{`import { ComposedPolicy } from "@muix/policy";

const policy = new ComposedPolicy({
  id: "compound",
  mode: "and",   // "and" = all must allow | "or" = any allow is enough
  policies: [rateLimitPolicy, permissionPolicy],
  priority: 10,
});`}</pre>
    </>
  );
}
