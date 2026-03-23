import { describe, it, expect, beforeEach, vi } from 'vitest';
import { microphoneCapability, cameraCapability, screenCaptureCapability } from '../probes/media-devices.js';
import { speechSynthesisCapability, speechRecognitionCapability } from '../probes/speech.js';
import { webRTCCapability } from '../probes/webrtc.js';

describe('MediaDevices probes', () => {
  beforeEach(() => {
    // Reset navigator.mediaDevices mock
    Object.defineProperty(global, 'navigator', {
      value: { mediaDevices: undefined },
      writable: true,
      configurable: true,
    });
  });

  it('microphoneCapability returns unavailable when mediaDevices is absent', async () => {
    const status = await microphoneCapability.probe();
    expect(status).toBe('unavailable');
  });

  it('microphoneCapability returns available when audioinput device exists', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        mediaDevices: {
          enumerateDevices: vi.fn().mockResolvedValue([
            { kind: 'audioinput', label: 'Mic', deviceId: '1', groupId: '1' },
          ]),
        },
      },
      writable: true,
      configurable: true,
    });
    const status = await microphoneCapability.probe();
    expect(status).toBe('available');
  });

  it('microphoneCapability returns unavailable when no audioinput exists', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        mediaDevices: {
          enumerateDevices: vi.fn().mockResolvedValue([
            { kind: 'videoinput', label: 'Camera', deviceId: '2', groupId: '2' },
          ]),
        },
      },
      writable: true,
      configurable: true,
    });
    const status = await microphoneCapability.probe();
    expect(status).toBe('unavailable');
  });

  it('cameraCapability returns available when videoinput device exists', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        mediaDevices: {
          enumerateDevices: vi.fn().mockResolvedValue([
            { kind: 'videoinput', label: 'Camera', deviceId: '1', groupId: '1' },
          ]),
        },
      },
      writable: true,
      configurable: true,
    });
    const status = await cameraCapability.probe();
    expect(status).toBe('available');
  });

  it('screenCaptureCapability returns available when getDisplayMedia exists', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        mediaDevices: {
          getDisplayMedia: vi.fn(),
        },
      },
      writable: true,
      configurable: true,
    });
    const status = await screenCaptureCapability.probe();
    expect(status).toBe('available');
  });

  it('screenCaptureCapability returns unavailable when getDisplayMedia is absent', async () => {
    const status = await screenCaptureCapability.probe();
    expect(status).toBe('unavailable');
  });
});

describe('Speech probes', () => {
  it('speechSynthesisCapability returns available when window.speechSynthesis exists', async () => {
    Object.defineProperty(global, 'window', {
      value: { speechSynthesis: {} },
      writable: true,
      configurable: true,
    });
    const status = await speechSynthesisCapability.probe();
    expect(status).toBe('available');
  });

  it('speechRecognitionCapability returns available when SpeechRecognition exists', async () => {
    Object.defineProperty(global, 'window', {
      value: { SpeechRecognition: class {} },
      writable: true,
      configurable: true,
    });
    const status = await speechRecognitionCapability.probe();
    expect(status).toBe('available');
  });
});

describe('WebRTC probe', () => {
  it('returns available when RTCPeerConnection exists', async () => {
    Object.defineProperty(global, 'window', {
      value: { RTCPeerConnection: class {} },
      writable: true,
      configurable: true,
    });
    const status = await webRTCCapability.probe();
    expect(status).toBe('available');
  });

  it('returns unavailable when RTCPeerConnection is absent', async () => {
    Object.defineProperty(global, 'window', {
      value: {},
      writable: true,
      configurable: true,
    });
    const status = await webRTCCapability.probe();
    expect(status).toBe('unavailable');
  });
});
