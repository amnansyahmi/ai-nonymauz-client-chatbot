import type { AudioContextCtor, SpeechWindow } from './types';

export type VadOptions = {
  threshold?: number;
  speechHoldMs?: number;
  silenceHoldMs?: number;
  fftSize?: number;
  smoothingTimeConstant?: number;
  emitRms?: boolean;
};

export type VadCallbacks = {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onError?: (reason: string) => void;
  onRms?: (rms: number) => void;
};

export type VadController = {
  start(): Promise<void>;
  stop(): void;
  isActive(): boolean;
  getRms(): number;
};

export function createVad(options: VadOptions = {}, callbacks: VadCallbacks = {}): VadController {
  const threshold = options.threshold ?? 0.02;
  const speechHoldMs = options.speechHoldMs ?? 220;
  const silenceHoldMs = options.silenceHoldMs ?? 700;
  const fftSize = options.fftSize ?? 1024;
  const smoothingTimeConstant = options.smoothingTimeConstant ?? 0.3;
  const emitRms = options.emitRms ?? true;

  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let mediaStream: MediaStream | null = null;
  let animationId: number | null = null;
  let active = false;
  let speechStartedAt: number | null = null;
  let lastSoundAt: number | null = null;
  let isSpeaking = false;
  let lastRms = 0;

  function computeRms(buffer: Float32Array): number {
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      const sample = buffer[i];
      sumSquares += sample * sample;
    }
    return Math.sqrt(sumSquares / buffer.length);
  }

  function handleFrame() {
    if (!active || !analyser) return;
    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);
    const rms = computeRms(buffer);
    lastRms = rms;
    if (emitRms) callbacks.onRms?.(rms);

    const now = Date.now();

    if (rms >= threshold) {
      lastSoundAt = now;
      if (!isSpeaking && speechStartedAt === null) {
        speechStartedAt = now;
      } else if (speechStartedAt !== null && !isSpeaking && now - speechStartedAt >= speechHoldMs) {
        isSpeaking = true;
        callbacks.onSpeechStart?.();
      }
    } else if (speechStartedAt !== null && now - speechStartedAt < speechHoldMs) {
      speechStartedAt = null;
    }

    if (isSpeaking && lastSoundAt !== null && now - lastSoundAt >= silenceHoldMs) {
      isSpeaking = false;
      speechStartedAt = null;
      callbacks.onSpeechEnd?.();
    }

    animationId = window.requestAnimationFrame(handleFrame);
  }

  async function start() {
    if (active) return;
    if (typeof window === 'undefined') {
      callbacks.onError?.('no-window');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      callbacks.onError?.('getUserMedia-missing');
      return;
    }
    const win = window as SpeechWindow;
    const Ctor: AudioContextCtor | undefined = win.AudioContext ?? win.webkitAudioContext;
    if (!Ctor) {
      callbacks.onError?.('audio-context-missing');
      return;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error.message : 'mic-denied');
      return;
    }

    try {
      audioContext = new Ctor();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const source = audioContext.createMediaStreamSource(mediaStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothingTimeConstant;
      source.connect(analyser);
      active = true;
      animationId = window.requestAnimationFrame(handleFrame);
    } catch (error) {
      cleanup();
      callbacks.onError?.(error instanceof Error ? error.message : 'audio-init-failed');
    }
  }

  function stop() {
    cleanup();
  }

  function cleanup() {
    active = false;
    isSpeaking = false;
    speechStartedAt = null;
    lastSoundAt = null;
    if (animationId !== null) {
      window.cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }
    analyser = null;
  }

  return {
    start,
    stop,
    isActive: () => active,
    getRms: () => lastRms
  };
}
