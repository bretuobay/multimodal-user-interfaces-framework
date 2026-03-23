# @muix/policy

[![npm](https://img.shields.io/npm/v/@muix/policy)](https://www.npmjs.com/package/@muix/policy)

Composable permission, concurrency, and rate-limit policies for MUIX sessions and channels.

## Install

```bash
npm install @muix/policy
```

## Usage

### PolicyEngine

```ts
import { createPolicyEngine } from "@muix/policy";
import { createPermissionPolicy, createConcurrencyPolicy, createRateLimitPolicy } from "@muix/policy";

const engine = createPolicyEngine();

// Add policies — evaluated in order, first rejection wins
engine.add(createPermissionPolicy({ allowed: ["microphone", "camera"] }));
engine.add(createConcurrencyPolicy({ maxConcurrent: 3 }));
engine.add(createRateLimitPolicy({ maxPerSecond: 10 }));

// Evaluate before performing an operation
const result = await engine.evaluate({ resource: "microphone", action: "acquire" });
if (!result.allowed) {
  console.error("denied:", result.reason);
}
```

### PermissionPolicy

Allowlist/denylist for named resources.

```ts
import { createPermissionPolicy } from "@muix/policy";

const policy = createPermissionPolicy({
  allowed: ["microphone", "camera"],
  // denied: ["screen-capture"],  // optional denylist
});
```

### ConcurrencyPolicy

Limits how many simultaneous operations may run against a resource.

```ts
import { createConcurrencyPolicy } from "@muix/policy";

const policy = createConcurrencyPolicy({ maxConcurrent: 2 });

// Tracks in-flight operations — call `release()` on each returned token
const token = await policy.acquire("microphone");
// ... do work ...
token.release();
```

### RateLimitPolicy

Token-bucket rate limiter; rejects when the bucket is empty.

```ts
import { createRateLimitPolicy } from "@muix/policy";

const policy = createRateLimitPolicy({
  maxPerSecond: 5,       // refill rate
  burst: 10,             // max bucket size
});
```

## Composing policies

```ts
import { createPolicyEngine, createPermissionPolicy, createConcurrencyPolicy } from "@muix/policy";

const engine = createPolicyEngine([
  createPermissionPolicy({ allowed: ["microphone"] }),
  createConcurrencyPolicy({ maxConcurrent: 1 }),
]);

const channel = session.addChannel("mic");
channel.observe().subscribe({
  next: async (frame) => {
    const check = await engine.evaluate({ resource: "microphone", action: "read" });
    if (check.allowed) process(frame);
  },
});
```

## API

| Export | Description |
|---|---|
| `createPolicyEngine(policies?)` | Engine factory |
| `createPermissionPolicy(options)` | Allow/deny by resource name |
| `createConcurrencyPolicy(options)` | Max-concurrent limiter |
| `createRateLimitPolicy(options)` | Token-bucket rate limiter |

## License

MIT
