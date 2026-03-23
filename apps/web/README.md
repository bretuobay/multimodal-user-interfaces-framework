# `apps/web`

The main MUIX example app.

This app is the flagship `Showcase Lab` for the framework. It is designed to
demonstrate the runtime itself, not just a single chat flow:

- streaming agent responses over `@muix/agent`
- live session and channel state via `@muix/core`
- motion and gesture input via `@muix/motion`
- passive capability probing via `@muix/capability`
- live inspection through `@muix/devtools`

## Run locally

From the repo root:

```bash
npm run dev -- --filter=web
```

Or from `apps/web`:

```bash
npm run dev
```

Then open `http://localhost:3000`.

## What to try

- Click a starter scenario card to trigger a scripted streaming response.
- Tap the motion surface to run the active scenario again.
- Swipe on the motion surface to rotate the active story.
- Cancel a long-form response mid-stream to see interruption behavior.
- Watch the runtime snapshot and floating devtools panel update as frames move.
