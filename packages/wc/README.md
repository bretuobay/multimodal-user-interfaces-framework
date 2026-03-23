# @muix/wc

[![npm](https://img.shields.io/npm/v/@muix/wc)](https://www.npmjs.com/package/@muix/wc)

Custom elements for framework-free MUIX integration. Works in any HTML page or alongside any framework.

## Install

```bash
npm install @muix/wc @muix/core
```

## Registration

Importing the package registers both elements via `customElements.define()`:

```js
import "@muix/wc"; // side-effect: registers <muix-session> and <muix-channel>
```

## `<muix-session>`

Creates and manages a `Session` lifecycle. Starts on `connectedCallback`, terminates on `disconnectedCallback`. Dispatches a `muix:session` custom event so children can receive the session instance.

```html
<muix-session id="app" session-id="chat-session">
  <muix-channel type="text" channel-id="messages"></muix-channel>
</muix-session>

<script type="module">
  import "@muix/wc";

  const sessionEl = document.querySelector("muix-session");
  sessionEl.session; // Session instance (available after connectedCallback)

  sessionEl.addEventListener("muix:session", (e) => {
    console.log("session ready:", e.detail.session);
  });
</script>
```

## `<muix-channel>`

Creates a `Channel` inside the nearest `<muix-session>` ancestor. Dispatches `muix:channel` (bubbles) when the channel is ready.

```html
<muix-channel type="audio" channel-id="mic-input"></muix-channel>

<script type="module">
  const channelEl = document.querySelector("muix-channel");
  channelEl.channel;       // Channel<unknown, unknown>
  channelEl.channelType;   // "audio"

  channelEl.addEventListener("muix:channel", (e) => {
    console.log("channel ready:", e.detail.channel);
  });
</script>
```

## Attributes

| Element | Attribute | Description |
|---|---|---|
| `<muix-session>` | `session-id` | Forwarded to `createSession({ id })` |
| `<muix-channel>` | `type` | `text \| audio \| video \| motion \| generic` |
| `<muix-channel>` | `channel-id` | Forwarded to `session.addChannel(id)` |

## Vanilla JS example

```html
<!DOCTYPE html>
<html>
  <body>
    <muix-session session-id="demo">
      <muix-channel type="text" channel-id="output"></muix-channel>
    </muix-session>

    <div id="log"></div>

    <script type="module">
      import "@muix/wc";

      document.querySelector("muix-channel").addEventListener("muix:channel", (e) => {
        const channel = e.detail.channel;
        channel.observe().subscribe({
          next: ({ data }) => {
            document.getElementById("log").textContent += data;
          },
        });
      });
    </script>
  </body>
</html>
```

## API

| Export | Description |
|---|---|
| `MuixSessionElement` | `<muix-session>` class |
| `MuixChannelElement` | `<muix-channel>` class |

Both are registered automatically on import.

## License

MIT
