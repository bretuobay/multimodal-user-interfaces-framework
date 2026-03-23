/**
 * WebXR capability probes.
 * Detects immersive-vr and immersive-ar session support without triggering
 * any permission prompts.
 *
 * Uses structural types for XRSession/XRSystem because TypeScript's DOM lib
 * gates these behind the `dom.webxr` lib entry which is not universally enabled.
 */

import type { CapabilityDescriptor, CapabilityStatus } from '../types.js';

/** Minimal structural shape of an XRSession handle */
interface XRSessionHandle {
  end(): Promise<void>;
}

/** Minimal structural shape of the XRSystem on navigator */
interface XRSystemLike {
  isSessionSupported(mode: string): Promise<boolean>;
  requestSession(mode: string): Promise<XRSessionHandle>;
}

type WindowWithXR = typeof globalThis & { navigator: Navigator & { xr?: XRSystemLike } };

function getXR(): XRSystemLike | undefined {
  return (globalThis as WindowWithXR).navigator?.xr;
}

async function probeXR(mode: string): Promise<CapabilityStatus> {
  const xr = getXR();
  if (!xr) return 'unavailable';
  try {
    const supported = await xr.isSessionSupported(mode);
    return supported ? 'available' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/** Immersive VR (head-mounted display) capability */
export const immersiveVrCapability: CapabilityDescriptor<XRSessionHandle> = {
  id: 'xr:immersive-vr',
  description: 'WebXR immersive VR session (head-mounted display)',
  probe: () => probeXR('immersive-vr'),
  acquire: async () => {
    const xr = getXR();
    if (!xr) throw new Error('WebXR not supported');
    return xr.requestSession('immersive-vr');
  },
  release: async (session) => { await session.end(); },
  fallbacks: [],
};

/** Immersive AR (passthrough/camera overlay) capability */
export const immersiveArCapability: CapabilityDescriptor<XRSessionHandle> = {
  id: 'xr:immersive-ar',
  description: 'WebXR immersive AR session (passthrough or overlay)',
  probe: () => probeXR('immersive-ar'),
  acquire: async () => {
    const xr = getXR();
    if (!xr) throw new Error('WebXR not supported');
    return xr.requestSession('immersive-ar');
  },
  release: async (session) => { await session.end(); },
  fallbacks: [immersiveVrCapability],
};

/** Inline (non-immersive) XR session for basic spatial tracking */
export const inlineXrCapability: CapabilityDescriptor<XRSessionHandle> = {
  id: 'xr:inline',
  description: 'WebXR inline session for non-immersive spatial tracking',
  probe: () => probeXR('inline'),
  acquire: async () => {
    const xr = getXR();
    if (!xr) throw new Error('WebXR not supported');
    return xr.requestSession('inline');
  },
  release: async (session) => { await session.end(); },
  fallbacks: [],
};
