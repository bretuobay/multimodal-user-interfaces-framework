export type {
  CapabilityDescriptor,
  CapabilityRegistry,
  CapabilitySet,
  CapabilityStatus,
  NegotiationResult,
} from './types.js';

export {
  CapabilityRegistryImpl,
  createCapabilityRegistry,
} from './registry.js';

// Built-in probes
export { microphoneCapability, cameraCapability, screenCaptureCapability } from './probes/media-devices.js';
export { speechSynthesisCapability, speechRecognitionCapability } from './probes/speech.js';
export { webRTCCapability } from './probes/webrtc.js';
