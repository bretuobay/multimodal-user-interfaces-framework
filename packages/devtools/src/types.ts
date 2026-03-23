/**
 * DevTools internal types.
 */

export interface ChannelSnapshot {
  id: string;
  status: string;
  frameCount: number;
  lastFrameAt: number | null;
  /** Frames per second over the last 1s window */
  fps: number;
}

export interface ActionSnapshot {
  id: string;
  status: string;
  startedAt: number;
}

export interface SessionSnapshot {
  id: string;
  status: string;
  channels: ChannelSnapshot[];
  actions: ActionSnapshot[];
  capturedAt: number;
}

export interface DevtoolsOptions {
  /** Position of the floating panel. Default: bottom-right */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Update interval in ms. Default 500 */
  updateIntervalMs?: number;
  /** Initial collapsed state. Default false */
  collapsed?: boolean;
}
