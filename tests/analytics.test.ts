import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { drainQueue, trackEvent, trackFromElement } from '../lib/analytics';

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

describe('analytics', () => {
  let store: Map<string, string>;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    store = installLocalStorage();
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    store.clear();
    debugSpy.mockRestore();
  });

  it('queues events with a timestamp', () => {
    trackEvent('add_guest', { name: 'Ali', pax: 2 });
    const raw = store.get('mm-analytics-queue');
    expect(raw).toBeDefined();
    const events = JSON.parse(raw!);
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('add_guest');
    expect(events[0].properties).toEqual({ name: 'Ali', pax: 2 });
    expect(typeof events[0].timestamp).toBe('string');
  });

  it('caps the queue at the maximum size', () => {
    for (let i = 0; i < 250; i += 1) {
      trackEvent(`evt_${i}`);
    }
    const events = JSON.parse(store.get('mm-analytics-queue')!);
    expect(events).toHaveLength(200);
    // Most recent event is first.
    expect(events[0].name).toBe('evt_249');
  });

  it('reads the data-event attribute from a clicked element', () => {
    const div = document.createElement('div');
    const button = document.createElement('button');
    button.dataset.event = 'send_chat';
    div.appendChild(button);
    document.body.appendChild(div);

    trackFromElement(button);

    const events = JSON.parse(store.get('mm-analytics-queue')!);
    expect(events[0].name).toBe('send_chat');

    document.body.removeChild(div);
  });

  it('drains the queue', () => {
    trackEvent('a');
    trackEvent('b');
    const drained = drainQueue();
    expect(drained.map((event) => event.name)).toEqual(['b', 'a']);
    expect(store.get('mm-analytics-queue')).toBe('[]');
  });
});
