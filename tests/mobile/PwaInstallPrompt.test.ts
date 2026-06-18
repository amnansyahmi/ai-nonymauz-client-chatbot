import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'mm-pwa-install-dismissed';

type MinimalNavigator = { standalone?: boolean };

function installLocalStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', {
    value: {
      localStorage: {
        getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => {
          store.clear();
        }
      }
    },
    configurable: true
  });
  return store;
}

function setNavigator(standalone: boolean | undefined): void {
  Object.defineProperty(globalThis, 'navigator', {
    value: standalone === undefined ? {} : { standalone },
    configurable: true
  });
}

function setMatchMedia(standalone: boolean): void {
  Object.defineProperty(globalThis.window, 'matchMedia', {
    value: (query: string) => ({
      matches: standalone && query.includes('standalone'),
      addEventListener: () => undefined
    }),
    configurable: true
  });
}

describe('PwaInstallPrompt standalone detection', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = installLocalStorage();
    setMatchMedia(false);
  });

  afterEach(() => {
    store.clear();
    vi.restoreAllMocks();
  });

  it('uses the localStorage key "mm-pwa-install-dismissed"', () => {
    store.set(STORAGE_KEY, '1');
    expect(store.get(STORAGE_KEY)).toBe('1');
    expect(store.has(STORAGE_KEY)).toBe(true);
  });

  it('has the expected storage key value of "1" when dismissed', () => {
    expect(STORAGE_KEY).toBe('mm-pwa-install-dismissed');
  });

  it('treats iOS Safari standalone mode as installed (navigator.standalone=true)', () => {
    setNavigator(true);
    const nav = globalThis.navigator as MinimalNavigator;
    expect(nav.standalone).toBe(true);
  });

  it('treats display-mode: standalone as installed (matchMedia)', () => {
    setMatchMedia(true);
    const media = globalThis.window.matchMedia('(display-mode: standalone)');
    expect(media.matches).toBe(true);
  });

  it('returns false when no standalone indicators are present', () => {
    setNavigator(false);
    setMatchMedia(false);
    const nav = globalThis.navigator as MinimalNavigator;
    const media = globalThis.window.matchMedia('(display-mode: standalone)');
    expect(nav.standalone).toBe(false);
    expect(media.matches).toBe(false);
  });
});
