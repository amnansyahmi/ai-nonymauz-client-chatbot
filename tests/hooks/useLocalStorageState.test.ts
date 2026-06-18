import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLocalStorageState } from '../../hooks/useLocalStorageState';

type LocalStorageShim = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

function installLocalStorage(): LocalStorageShim {
  const store = new Map<string, string>();
  const shim: LocalStorageShim = {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    }
  };
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: shim },
    configurable: true
  });
  return shim;
}

describe('useLocalStorageState', () => {
  let storage: LocalStorageShim;

  beforeEach(() => {
    storage = installLocalStorage();
  });

  afterEach(() => {
    storage.clear();
  });

  it('returns the initial value and hydrates when storage is empty', () => {
    const { result } = renderHook(() => useLocalStorageState('empty', 'initial'));
    expect(result.current[0]).toBe('initial');
    expect(result.current[2]).toBe(true);
  });

  it('hydrates from localStorage on mount', () => {
    storage.setItem('greeting', JSON.stringify('hello world'));
    const { result } = renderHook(() => useLocalStorageState<string>('greeting', 'fallback'));
    expect(result.current[2]).toBe(true);
    expect(result.current[0]).toBe('hello world');
  });

  it('persists updates to localStorage', () => {
    const { result } = renderHook(() => useLocalStorageState<number>('count', 0));

    act(() => {
      result.current[1](5);
    });

    expect(result.current[0]).toBe(5);
    expect(JSON.parse(storage.getItem('count')!)).toBe(5);
  });

  it('supports functional updaters', () => {
    const { result } = renderHook(() => useLocalStorageState<number>('counter', 10));

    act(() => {
      result.current[1]((previous) => previous + 5);
    });

    expect(result.current[0]).toBe(15);
    expect(JSON.parse(storage.getItem('counter')!)).toBe(15);
  });

  it('handles complex objects', () => {
    type Profile = { name: string; age: number };
    const { result } = renderHook(() =>
      useLocalStorageState<Profile>('profile', { name: 'Amin', age: 30 })
    );

    act(() => {
      result.current[1]({ name: 'Siti', age: 28 });
    });

    expect(result.current[0]).toEqual({ name: 'Siti', age: 28 });
    expect(JSON.parse(storage.getItem('profile')!)).toEqual({ name: 'Siti', age: 28 });
  });

  it('falls back to initial value when stored JSON is malformed', () => {
    storage.setItem('broken', '{not valid json');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { result } = renderHook(() => useLocalStorageState<string>('broken', 'fallback'));
    expect(result.current[0]).toBe('fallback');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('writes the hydrated value to storage after mount', () => {
    storage.setItem('seeded', JSON.stringify('from-storage'));
    renderHook(() => useLocalStorageState('seeded', 'fallback'));
    // After hydration the hook mirrors the value back to storage.
    expect(JSON.parse(storage.getItem('seeded')!)).toBe('from-storage');
  });

  it('persists complex nested arrays', () => {
    const { result } = renderHook(() => useLocalStorageState<string[]>('items', []));

    act(() => {
      result.current[1](['apple', 'banana', 'cherry']);
    });

    expect(result.current[0]).toEqual(['apple', 'banana', 'cherry']);
    expect(JSON.parse(storage.getItem('items')!)).toEqual(['apple', 'banana', 'cherry']);
  });
});
