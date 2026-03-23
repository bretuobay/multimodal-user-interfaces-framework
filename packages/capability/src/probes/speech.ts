/**
 * Web Speech API capability probes.
 */

import type { CapabilityDescriptor, CapabilityStatus } from '../types.js';

/** Speech synthesis (text-to-speech) capability */
export const speechSynthesisCapability: CapabilityDescriptor<SpeechSynthesis> =
  {
    id: 'speech:synthesis',
    description: 'Text-to-speech via the Web Speech API',
    probe: async (): Promise<CapabilityStatus> => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        return 'unavailable';
      }
      return 'available';
    },
    acquire: async () => {
      if (!window.speechSynthesis) {
        throw new Error('SpeechSynthesis not supported');
      }
      return window.speechSynthesis;
    },
    release: async () => {
      // SpeechSynthesis is a global singleton — nothing to release
    },
    fallbacks: [],
  };

// SpeechRecognition is not in standard TypeScript DOM lib — use a structural type
type SpeechRecognitionInstance = {
  start(): void;
  stop(): void;
  abort(): void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type WindowWithSpeechRecognition = typeof window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

/** Speech recognition capability */
export const speechRecognitionCapability: CapabilityDescriptor<SpeechRecognitionInstance> =
  {
    id: 'speech:recognition',
    description: 'Speech-to-text via the Web Speech API',
    probe: async (): Promise<CapabilityStatus> => {
      if (typeof window === 'undefined') return 'unavailable';
      const w = window as WindowWithSpeechRecognition;
      const hasSR = !!w.SpeechRecognition || !!w.webkitSpeechRecognition;
      return hasSR ? 'available' : 'unavailable';
    },
    acquire: async () => {
      const w = window as WindowWithSpeechRecognition;
      const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
      if (!SR) throw new Error('SpeechRecognition not supported');
      return new SR();
    },
    release: async (sr) => {
      sr.stop();
    },
    fallbacks: [],
  };
