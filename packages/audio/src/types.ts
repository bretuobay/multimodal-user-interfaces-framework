/**
 * Audio modality types.
 */

/** A chunk of raw PCM audio data from one or more channels. */
export interface AudioFrame {
  /** Interleaved or per-channel PCM samples in [-1, 1] range */
  readonly buffer: Float32Array;
  readonly sampleRate: number;
  readonly channelCount: number;
  readonly timestamp: number;
}

/** Voice activity detection result attached to an AudioFrame */
export interface VadResult {
  readonly isSpeech: boolean;
  /** Root-mean-square energy level [0, 1] */
  readonly rms: number;
}

export interface AudioChannelOptions {
  id?: string;
  sampleRate?: number;
  channelCount?: number;
}

export interface MicrophoneSourceOptions {
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export interface VadOptions {
  /** RMS threshold below which audio is considered silence [0, 1]. Default 0.01 */
  threshold?: number;
  /** Consecutive silent frames before VAD emits isSpeech=false. Default 10 */
  silencePadFrames?: number;
}
