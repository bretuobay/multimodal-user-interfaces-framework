/**
 * Voice Activity Detection (VAD) — simple RMS-threshold approach.
 *
 * Annotates each AudioFrame with a VadResult. Includes silence-padding to
 * avoid rapid on/off toggling.
 */

import { Observable, type ChannelFrame } from '@muix/core';
import type { AudioFrame, VadResult, VadOptions } from './types.js';

export interface AudioFrameWithVad {
  readonly frame: AudioFrame;
  readonly vad: VadResult;
}

export function computeRms(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

/**
 * Wraps an Observable<ChannelFrame<AudioFrame>> (from AudioChannel.observe())
 * and annotates each frame with a VadResult.
 */
export function createVad(
  source: Observable<ChannelFrame<AudioFrame>>,
  options: VadOptions = {},
): Observable<AudioFrameWithVad> {
  const threshold = options.threshold ?? 0.01;
  const silencePadFrames = options.silencePadFrames ?? 10;

  return new Observable<AudioFrameWithVad>((observer) => {
    let silentFrameCount = 0;
    let currentlySpeech = false;

    const sub = source.subscribe({
      next: (channelFrame) => {
        const frame = channelFrame.data;
        const rms = computeRms(frame.buffer);
        const aboveThreshold = rms >= threshold;

        if (aboveThreshold) {
          silentFrameCount = 0;
          currentlySpeech = true;
        } else {
          silentFrameCount++;
          if (silentFrameCount >= silencePadFrames) {
            currentlySpeech = false;
          }
        }

        observer.next({ frame, vad: { isSpeech: currentlySpeech, rms } });
      },
      error: (e) => observer.error(e),
      complete: () => observer.complete(),
    });

    return () => sub.unsubscribe();
  });
}
