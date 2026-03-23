import { describe, it, expect, beforeAll } from 'vitest';
import { MuixSessionElement } from '../muix-session-element.js';
import { MuixChannelElement } from '../muix-channel-element.js';

beforeAll(() => {
  // Register elements if not already registered (jsdom)
  if (!customElements.get('muix-session')) {
    customElements.define('muix-session', MuixSessionElement);
  }
  if (!customElements.get('muix-channel')) {
    customElements.define('muix-channel', MuixChannelElement);
  }
});

describe('MuixSessionElement', () => {
  it('creates a session on connect', async () => {
    const el = document.createElement('muix-session') as MuixSessionElement;
    document.body.appendChild(el);

    // Give microtask queue time to run start()
    await Promise.resolve();

    expect(el.session).not.toBeNull();
    expect(el.session?.status.value).toMatch(/created|active/);

    document.body.removeChild(el);
  });

  it('dispatches muix:session event', () => {
    const el = document.createElement('muix-session') as MuixSessionElement;
    let fired = false;

    el.addEventListener('muix:session', (e) => {
      fired = true;
      expect((e as CustomEvent).detail.session).toBeDefined();
    });

    document.body.appendChild(el);
    expect(fired).toBe(true);

    document.body.removeChild(el);
  });

  it('terminates session on disconnect', async () => {
    const el = document.createElement('muix-session') as MuixSessionElement;
    document.body.appendChild(el);
    await Promise.resolve();

    const session = el.session!;
    document.body.removeChild(el);

    expect(el.session).toBeNull();
    // Give terminate() microtask time
    await Promise.resolve();
    expect(session.status.value).toBe('terminated');
  });
});

describe('MuixChannelElement', () => {
  it('creates a channel within parent session', async () => {
    const sessionEl = document.createElement('muix-session') as MuixSessionElement;
    const channelEl = document.createElement('muix-channel') as MuixChannelElement;
    channelEl.setAttribute('type', 'text');
    channelEl.setAttribute('channel-id', 'test-ch');

    sessionEl.appendChild(channelEl);
    document.body.appendChild(sessionEl);

    await Promise.resolve();

    expect(channelEl.channel).not.toBeNull();
    expect(channelEl.channelType).toBe('text');

    document.body.removeChild(sessionEl);
  });

  it('dispatches muix:channel event', async () => {
    const sessionEl = document.createElement('muix-session') as MuixSessionElement;
    const channelEl = document.createElement('muix-channel') as MuixChannelElement;
    let channelFired = false;

    sessionEl.addEventListener('muix:channel', () => { channelFired = true; });
    sessionEl.appendChild(channelEl);
    document.body.appendChild(sessionEl);

    await Promise.resolve();
    expect(channelFired).toBe(true);

    document.body.removeChild(sessionEl);
  });
});
