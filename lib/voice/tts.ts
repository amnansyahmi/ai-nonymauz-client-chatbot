export type SpeakOptions = {
  text: string;
  voice: SpeechSynthesisVoice | null;
  lang: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (reason: string) => void;
};

type ActiveSession = {
  utterance: SpeechSynthesisUtterance;
  text: string;
  finished: boolean;
  watchdog: number | null;
  onEnd: () => void;
  onError: (reason: string) => void;
};

export type TtsController = {
  speak(options: SpeakOptions): void;
  cancel(): void;
  pause(): void;
  resume(): void;
  isSpeaking(): boolean;
  voicesReady(): Promise<SpeechSynthesisVoice[]>;
};

const CHARS_PER_MS = 1 / 22;
const MIN_WATCHDOG_MS = 4000;
const WATCHDOG_BUFFER_MS = 2500;

function estimateDurationMs(text: string, rate: number): number {
  const base = Math.max(MIN_WATCHDOG_MS, text.length * CHARS_PER_MS);
  return Math.ceil(base / Math.max(0.5, Math.min(2, rate)));
}

export function createTtsController(): TtsController {
  let active: ActiveSession | null = null;

  function finalize(session: ActiveSession, errorReason?: string) {
    if (session.finished) return;
    session.finished = true;
    if (session.watchdog) {
      window.clearTimeout(session.watchdog);
      session.watchdog = null;
    }
    if (active === session) active = null;
    if (errorReason) session.onError(errorReason);
    else session.onEnd();
  }

  function speak(options: SpeakOptions) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      options.onError?.('speechSynthesis-not-supported');
      return;
    }
    if (!options.text.trim()) {
      options.onEnd?.();
      return;
    }

    cancel();

    const rate = options.rate ?? 1;
    const utterance = new SpeechSynthesisUtterance(options.text);
    if (options.voice) utterance.voice = options.voice;
    utterance.lang = options.lang;
    utterance.rate = rate;
    utterance.pitch = options.pitch ?? 1;
    utterance.volume = options.volume ?? 1;

    const session: ActiveSession = {
      utterance,
      text: options.text,
      finished: false,
      watchdog: null,
      onEnd: options.onEnd ?? (() => {}),
      onError: options.onError ?? (() => {})
    };
    active = session;

    utterance.onstart = () => options.onStart?.();

    utterance.onend = () => finalize(session);
    utterance.onerror = (event) => {
      const reason = event.error || 'unknown';
      if (reason === 'canceled' || reason === 'interrupted') {
        finalize(session);
        return;
      }
      finalize(session, reason);
    };

    const estimated = estimateDurationMs(options.text, rate);
    session.watchdog = window.setTimeout(() => {
      if (session.finished) return;
      try {
        window.speechSynthesis.cancel();
      } catch {}
      finalize(session);
    }, estimated + WATCHDOG_BUFFER_MS);

    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      finalize(session, error instanceof Error ? error.message : 'speak-failed');
    }
  }

  function cancel() {
    if (active) {
      active.finished = true;
      if (active.watchdog) {
        window.clearTimeout(active.watchdog);
        active.watchdog = null;
      }
      active = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  return {
    speak,
    cancel,
    pause: () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.pause();
        } catch {}
      }
    },
    resume: () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.resume();
        } catch {}
      }
    },
    isSpeaking: () => active !== null,
    voicesReady: () => waitForVoices()
  };
}

export function waitForVoices(timeoutMs = 2000): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([]);
  }
  const initial = window.speechSynthesis.getVoices();
  if (initial.length > 0) return Promise.resolve(initial);

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', onChange);
      resolve(window.speechSynthesis.getVoices());
    }, timeoutMs);

    const onChange = () => {
      window.clearTimeout(timer);
      window.speechSynthesis.removeEventListener?.('voiceschanged', onChange);
      resolve(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.addEventListener?.('voiceschanged', onChange);
  });
}

const SENTENCE_REGEX = /[^.!?\n]+[.!?]+|[^.!?\n]+$/g;

export function splitIntoSentences(text: string): string[] {
  if (!text) return [];
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const parts: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(SENTENCE_REGEX.source, 'g');
  while ((match = regex.exec(normalized)) !== null) {
    const segment = match[0].trim();
    if (segment) parts.push(segment);
  }
  return parts;
}

export type StreamingTtsOptions = {
  voice: SpeechSynthesisVoice | null;
  lang: string;
  rate?: number;
  pitch?: number;
  onSentenceStart?: (sentence: string, index: number) => void;
  onSentenceEnd?: (sentence: string, index: number) => void;
  onComplete?: (fullText: string) => void;
  onError?: (reason: string) => void;
};

export type StreamingTtsHandle = {
  push(delta: string): void;
  finish(): Promise<string>;
  cancel(): void;
  isStreaming(): boolean;
  isSpeaking(): boolean;
};

/**
 * Streaming sentence-level TTS. As text deltas arrive, sentences are split
 * (at . ! ? boundaries) and queued for speech. The first sentence starts
 * speaking immediately while the rest is still being received — that is
 * what makes the voice mode feel "live" instead of waiting for the whole
 * answer to arrive before speaking anything.
 */
export function createStreamingTts(options: StreamingTtsOptions): StreamingTtsHandle {
  const controller = createTtsController();
  let buffer = '';
  let fullText = '';
  let queue: string[] = [];
  let currentIndex = 0;
  let speaking = false;
  let finished = false;
  let cancelled = false;

  function next() {
    if (cancelled) return;
    if (queue.length === 0) {
      speaking = false;
      if (finished) options.onComplete?.(fullText);
      return;
    }
    speaking = true;
    const sentence = queue.shift()!;
    const index = currentIndex;
    currentIndex += 1;
    options.onSentenceStart?.(sentence, index);
    controller.speak({
      text: sentence,
      voice: options.voice,
      lang: options.lang,
      rate: options.rate,
      pitch: options.pitch,
      onEnd: () => {
        options.onSentenceEnd?.(sentence, index);
        next();
      },
      onError: (reason) => {
        options.onSentenceEnd?.(sentence, index);
        if (reason !== 'canceled' && reason !== 'interrupted') {
          options.onError?.(reason);
        }
        next();
      }
    });
  }

  function push(delta: string) {
    if (cancelled || finished) return;
    buffer += delta;
    const parts = buffer.split(/([.!?\n]+)/);
    buffer = '';
    let pending = '';
    for (let i = 0; i < parts.length; i += 1) {
      const chunk = parts[i];
      if (i % 2 === 0) {
        if (chunk) pending += chunk;
      } else {
        const punctuation = chunk;
        if (pending && punctuation) {
          const sentence = (pending + punctuation).trim();
          if (sentence) {
            fullText += (fullText ? ' ' : '') + sentence;
            queue.push(sentence);
          }
          pending = '';
        } else if (punctuation) {
          pending += punctuation;
        }
      }
    }
    if (pending.trim()) {
      buffer = pending;
    }
    if (queue.length > 0 && !speaking) {
      next();
    }
  }

  async function finish() {
    if (cancelled) return fullText;
    if (buffer.trim()) {
      const sentence = buffer.trim();
      fullText += (fullText ? ' ' : '') + sentence;
      queue.push(sentence);
      buffer = '';
    }
    finished = true;
    if (queue.length > 0 && !speaking) {
      next();
    } else if (queue.length === 0) {
      options.onComplete?.(fullText);
    }
    return fullText;
  }

  function cancel() {
    cancelled = true;
    finished = true;
    buffer = '';
    queue = [];
    controller.cancel();
  }

  return {
    push,
    finish,
    cancel,
    isStreaming: () => !finished && !cancelled,
    isSpeaking: () => speaking
  };
}
