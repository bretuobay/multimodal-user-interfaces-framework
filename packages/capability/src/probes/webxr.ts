/**
 * WebXR capability probes.
 * Detects immersive-vr and immersive-ar session support without triggering
 * any permission prompts.
 */

import type { CapabilityDescriptor, CapabilityStatus } from '../types.js';

type XRSessionMode = 'immersive-vr' | 'immersive-ar' | 'inline';

async function probeXR(mode: XRSessionMode): Promise<CapabilityStatus> {
  if (typeof navigator === 'undefined' || !('xr' in navigator)) {
    return 'unavailable';
  }
  try {
    const supported = await (navigator as Navigator & { xr: { isSessionSupported(m: string): Promise<boolean> } }).xr.isSessionSupported(mode);
    return supported ? 'available' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/** Immersive VR (head-mounted display) capability */
export const immersiveVrCapability: CapabilityDescriptor<XRSession> = {
  id: 'xr:immersive-vr',
  description: 'WebXR immersive VR session (head-mounted display)',
  probe: () => probeXR('immersive-vr'),
  acquire: async () => {
    const xr = (navigator as Navigator & { xr: XRSystem }).xr;
    if (!xr) throw new Error('WebXR not supported');
    return xr.requestSession('immersive-vr');
  },
  release: async (session: XRSession) => {
    await session.end();
  },
  fallbacks: [],
};

/** Immersive AR (passthrough/camera overlay) capability */
export const immersiveArCapability: CapabilityDescriptor<XRSession> = {
  id: 'xr:immersive-ar',
  description: 'WebXR immersive AR session (passthrough or overlay)',
  probe: () => probeXR('immersive-ar'),
  acquire: async () => {
    const xr = (navigator as Navigator & { xr: XRSystem }).xr;
    if (!xr) throw new Error('WebXR not supported');
    return xr.requestSession('immersive-ar');
  },
  release: async (session: XRSession) => {
    await session.end();
  },
  fallbacks: [immersiveVrCapability as unknown as CapabilityDescriptor<XRSession>],
};

/** Inline (non-immersive) XR session for basic spatial tracking */
export const inlineXrCapability: CapabilityDescriptor<XRSession> = {
  id: 'xr:inline',
  description: 'WebXR inline session for non-immersive spatial tracking',
  probe: () => probeXR('inline'),
  acquire: async () => {
    const xr = (navigator as Navigator & { xr: XRSystem }).xr;
    if (!xr) throw new Error('WebXR not supported');
    return xr.requestSession('inline');
  },
  release: async (session: XRSession) => {
    await session.end();
  },
  fallbacks: [],
};
