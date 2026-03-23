/**
 * Video modality types.
 * Uses `MuixVideoFrame` to avoid conflict with the native `VideoFrame` Web API.
 */

export interface MuixVideoFrame {
  /** RGBA pixel data from the captured frame */
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly timestamp: number;
}

export interface VideoChannelOptions {
  id?: string;
  width?: number;
  height?: number;
  frameRate?: number;
}

export interface CameraSourceOptions {
  width?: number;
  height?: number;
  frameRate?: number;
  facingMode?: 'user' | 'environment';
}

export interface CanvasSinkOptions {
  /** If true, clears the canvas before each draw. Default true */
  autoClear?: boolean;
}
