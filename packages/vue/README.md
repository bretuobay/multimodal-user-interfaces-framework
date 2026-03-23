# @muix/vue

[![npm](https://img.shields.io/npm/v/@muix/vue)](https://www.npmjs.com/package/@muix/vue)

Vue 3 composables for MUIX — mirrors the React hooks API using `shallowRef` and `onScopeDispose`.

## Install

```bash
npm install @muix/vue @muix/core
```

## Usage

### Session context

```vue
<!-- ParentComponent.vue -->
<script setup>
import { provideSession } from "@muix/vue";
provideSession(); // creates, starts, and provides a Session
</script>

<!-- ChildComponent.vue -->
<script setup>
import { useSession } from "@muix/vue";
const session = useSession();
</script>
```

### useSignal

Returns a `ShallowRef<T>` that updates whenever the signal changes. Subscription is cleaned up via `onScopeDispose`.

```vue
<script setup>
import { useSignal } from "@muix/vue";

const props = defineProps<{ channel: Channel<unknown> }>();
const status = useSignal(props.channel.status); // Ref<ChannelStatus>
</script>

<template>
  <span :class="status">{{ status }}</span>
</template>
```

### useChannel

```vue
<script setup>
import { useChannel, useSession } from "@muix/vue";

const session = useSession();
const { channel, status, error } = useChannel(
  (s) => s.addChannel("messages"),
  session,
);
// channel is closed automatically on scope dispose
</script>
```

### useAction

```vue
<script setup>
import { useAction } from "@muix/vue";

const { dispatch, status, result, cancel } = useAction(definition, session);
</script>

<template>
  <button @click="dispatch" :disabled="status === 'running'">Run</button>
  <button v-if="status === 'running'" @click="cancel">Cancel</button>
</template>
```

### useAgent

```vue
<script setup>
import { useAgent } from "@muix/vue";
import { createAgentChannel } from "@muix/agent";

const channel = createAgentChannel({ endpoint: "/api/chat" });
const { send, history, streamingText, isStreaming, cancel, clear } =
  useAgent({ channel });
</script>

<template>
  <div v-for="(msg, i) in history" :key="i">
    <b>{{ msg.role }}:</b> {{ msg.content }}
  </div>
  <div v-if="isStreaming"><b>assistant:</b> {{ streamingText }}▌</div>
  <button @click="send({ role: 'user', content: 'Hello' })">Send</button>
</template>
```

## API

| Export | Description |
|---|---|
| `provideSession(options?)` | Create, start, and `provide()` a session |
| `useSession()` | `inject()` session from ancestor |
| `useSignal(signal)` | `ShallowRef<T>` backed by a MUIX signal |
| `useChannel(factory, session?)` | Create and manage a channel |
| `useAction(definition, session?)` | Manage an action |
| `useAgent(options)` | Full streaming agent composable |

## License

MIT
