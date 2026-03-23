/**
 * WebRTC capability probe.
 */

import type { CapabilityDescriptor, CapabilityStatus } from '../types.js';

export const webRTCCapability: CapabilityDescriptor<RTCPeerConnection> = {
  id: 'network:webrtc',
  description: 'Real-time peer-to-peer communication via WebRTC',
  probe: async (): Promise<CapabilityStatus> => {
    if (typeof window === 'undefined' || !window.RTCPeerConnection) {
      return 'unavailable';
    }
    return 'available';
  },
  acquire: async () => {
    if (!window.RTCPeerConnection) {
      throw new Error('RTCPeerConnection not supported');
    }
    return new RTCPeerConnection();
  },
  release: async (pc: RTCPeerConnection) => {
    pc.close();
  },
  fallbacks: [],
};
