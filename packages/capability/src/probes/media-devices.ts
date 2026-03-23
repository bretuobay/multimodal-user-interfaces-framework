/**
 * MediaDevices capability probes.
 * Detects microphone and camera availability without requesting permission.
 */

import type { CapabilityDescriptor, CapabilityStatus } from '../types.js';

async function probeMediaKind(
  kind: 'audioinput' | 'videoinput',
): Promise<CapabilityStatus> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices?.enumerateDevices
  ) {
    return 'unavailable';
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const found = devices.some((d) => d.kind === kind);
    return found ? 'available' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/** Microphone (audio input) capability */
export const microphoneCapability: CapabilityDescriptor<MediaStream> = {
  id: 'media:microphone',
  description: 'Audio input via the device microphone',
  probe: () => probeMediaKind('audioinput'),
  acquire: async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('getUserMedia not supported');
    }
    return navigator.mediaDevices.getUserMedia({ audio: true });
  },
  release: async (stream: MediaStream) => {
    stream.getTracks().forEach((t) => t.stop());
  },
  fallbacks: [],
};

/** Camera (video input) capability */
export const cameraCapability: CapabilityDescriptor<MediaStream> = {
  id: 'media:camera',
  description: 'Video input via the device camera',
  probe: () => probeMediaKind('videoinput'),
  acquire: async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('getUserMedia not supported');
    }
    return navigator.mediaDevices.getUserMedia({ video: true });
  },
  release: async (stream: MediaStream) => {
    stream.getTracks().forEach((t) => t.stop());
  },
  fallbacks: [],
};

/** Screen capture capability */
export const screenCaptureCapability: CapabilityDescriptor<MediaStream> = {
  id: 'media:screen',
  description: 'Screen/window capture via getDisplayMedia',
  probe: async (): Promise<CapabilityStatus> => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getDisplayMedia
    ) {
      return 'unavailable';
    }
    return 'available';
  },
  acquire: async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('getDisplayMedia not supported');
    }
    return navigator.mediaDevices.getDisplayMedia({ video: true });
  },
  release: async (stream: MediaStream) => {
    stream.getTracks().forEach((t) => t.stop());
  },
  fallbacks: [],
};
