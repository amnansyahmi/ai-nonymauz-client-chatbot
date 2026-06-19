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
  // Chrome SpeechSynthesis 14-second stall bug: after ~14s Chrome silently
  // stops without firing onend. Pause+resume every 10s keeps the engine alive.
  let keepAliveId: number | null = null;

  function startKeepAlive() {
    if (typeof window === 'undefined') return;
    if (keepAliveId !== null) return;
    keepAliveId = window.setInterval(() => {
      try {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      } catch {}
    }, 10_000);
  }

  function stopKeepAlive() {
    if (keepAliveId !== null) {
      window.clearInterval(keepAliveId);
      keepAliveId = null;
    }
  }

  function finalize(session: ActiveSession, errorReason?: string) {
    if (session.finished) return;
    session.finished = true;
    if (session.watchdog) {
      window.clearTimeout(session.watchdog);
      session.watchdog = null;
    }
    stopKeepAlive();
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
    startKeepAlive();

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

    // Small gap before calling speak() so Chrome has time to settle after
    // the cancel() above — prevents silent failures on rapid sequences.
    window.setTimeout(() => {
      if (session.finished) return;
      try {
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        finalize(session, error instanceof Error ? error.message : 'speak-failed');
      }
    }, 30);
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
    stopKeepAlive();
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

// Abbreviations whose trailing period must not be treated as a sentence end
const ABBREV_RE = /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|No|etc|approx|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\./gi;

function splitLongSentence(sentence: string): string[] {
  // For very long sentences, break at '; ' then ', ' boundaries
  const semi = sentence.split(/;\s+/);
  if (semi.length > 1) {
    return semi.map((p, i) => (i < semi.length - 1 ? p + ';' : p)).filter((p) => p.trim().length > 0);
  }

  const chunks = sentence.split(/,\s+/);
  if (chunks.length <= 2) return [sentence];

  const result: string[] = [];
  let current = '';
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    if (!current) {
      current = chunk;
    } else if (current.length < 55) {
      current += ', ' + chunk;
    } else {
      result.push(current + (i < chunks.length - 1 ? ',' : ''));
      current = chunk;
    }
  }
  if (current) result.push(current);
  return result.filter((s) => s.trim().length > 0);
}

export function splitIntoSentences(text: string): string[] {
  if (!text) return [];
  let normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  // Temporarily protect abbreviation periods and ellipsis
  normalized = normalized.replace(ABBREV_RE, '$1\x01').replace(/\.{3}/g, '\x02');

  const parts: string[] = [];
  const regex = new RegExp(SENTENCE_REGEX.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(normalized)) !== null) {
    const segment = match[0]
      .replace(/\x01/g, '.')
      .replace(/\x02/g, '...')
      .trim();
    if (!segment) continue;
    if (segment.length > 100) {
      parts.push(...splitLongSentence(segment));
    } else {
      parts.push(segment);
    }
  }
  return parts;
}

// Abbreviation endings that should not trigger a sentence break in the stream
const STREAMING_ABBREV_END = /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|No|approx)$/i;

export type StreamingTtsOptions = {
  voice: SpeechSynthesisVoice | null;
  lang: string;
  rate?: number;
  pitch?: number;
  pauseBetweenMs?: number;
  humanize?: (text: string) => string;
  prosodyForSentence?: (sentence: string, index: number, isLast: boolean) => { rate: number; pitch: number };
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
    // isLast is true when queue is now empty and streaming is done
    const isLast = finished && queue.length === 0;
    const spoken = options.humanize ? options.humanize(sentence) : sentence;
    const prosody = options.prosodyForSentence
      ? options.prosodyForSentence(sentence, index, isLast)
      : { rate: options.rate, pitch: options.pitch };
    options.onSentenceStart?.(sentence, index);
    const resume = () => {
      if (cancelled) return;
      const pause = options.pauseBetweenMs ?? 0;
      if (pause > 0) {
        window.setTimeout(() => { if (!cancelled) next(); }, pause);
      } else {
        next();
      }
    };
    controller.speak({
      text: spoken,
      voice: options.voice,
      lang: options.lang,
      rate: prosody.rate,
      pitch: prosody.pitch,
      onEnd: () => {
        options.onSentenceEnd?.(sentence, index);
        resume();
      },
      onError: (reason) => {
        options.onSentenceEnd?.(sentence, index);
        if (reason !== 'canceled' && reason !== 'interrupted') {
          options.onError?.(reason);
        }
        resume();
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
        // Don't split on a lone "." that follows a known abbreviation
        if (punctuation === '.' && STREAMING_ABBREV_END.test(pending.trimEnd())) {
          pending += punctuation;
          continue;
        }
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
    } else if (queue.length === 0 && !speaking) {
      // Only fire onComplete when nothing is queued AND nothing is speaking.
      // If speaking=true the last sentence is still playing — next() will fire
      // onComplete once that sentence's onEnd arrives.
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
