import type { Metadata } from "next";
import { CodeBlock } from "@repo/ui";

export const metadata: Metadata = { title: "@muix/vue" };

export default async function VuePage() {
  return (
    <>
      <h1>@muix/vue</h1>
      <p className="docs-lede">
        Vue 3 composables — mirrors the React hooks API using{" "}
        <code>shallowRef</code> and <code>onScopeDispose</code>.
      </p>

      <h2>Session context</h2>
      <CodeBlock
        code={`<!-- ParentComponent.vue -->
<script setup>
import { provideSession } from "@muix/vue";
provideSession();   // creates, starts, and provides a Session
</script>

<!-- ChildComponent.vue -->
<script setup>
import { useSession } from "@muix/vue";
const session = useSession();
</script>`}
        language="vue"
        title="session-context.vue"
      />

      <h2>useSignal</h2>
      <p>Returns a <code>ShallowRef</code> that updates whenever the signal changes.</p>
      <CodeBlock
        code={`<script setup>
import { useSignal } from "@muix/vue";
const status = useSignal(channel.status);   // Ref<ChannelStatus>
</script>

<template>
  <span>{{ status }}</span>
</template>`}
        language="vue"
        title="use-signal.vue"
      />

      <h2>useChannel</h2>
      <CodeBlock
        code={`<script setup>
import { useChannel } from "@muix/vue";
import { useSession } from "@muix/vue";

const session = useSession();
const { channel, status, error } = useChannel(
  (s) => s.addChannel("my-channel"),
  session,
);
// channel is closed automatically on scope dispose
</script>`}
        language="vue"
        title="use-channel.vue"
      />

      <h2>useAction</h2>
      <CodeBlock
        code={`<script setup>
import { useAction } from "@muix/vue";
const { dispatch, status, result, cancel } = useAction(definition, session);
</script>

<template>
  <button @click="dispatch" :disabled="status === 'running'">Run</button>
  <button v-if="status === 'running'" @click="cancel">Cancel</button>
</template>`}
        language="vue"
        title="use-action.vue"
      />

      <h2>useAgent</h2>
      <CodeBlock
        code={`<script setup>
import { useAgent } from "@muix/vue";
import { createAgentChannel } from "@muix/agent";

const channel = createAgentChannel({ endpoint: "/api/chat" });
const { send, history, streamingText, isStreaming, cancel, clear } =
  useAgent({ channel });
</script>`}
        language="vue"
        title="use-agent.vue"
      />
    </>
  );
}
