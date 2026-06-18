'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Updater<T> = T | ((previous: T) => T);

function isUpdater<T>(value: Updater<T>): value is (previous: T) => T {
  return typeof value === 'function';
}

function readFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    if (typeof console !== 'undefined') {
      console.warn(`useLocalStorageState: failed to read "${key}"`, error);
    }
    return fallback;
  }
}

function writeToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    if (typeof console !== 'undefined') {
      console.warn(`useLocalStorageState: failed to write "${key}"`, error);
    }
  }
}

export type UseLocalStorageStateResult<T> = [T, (next: Updater<T>) => void, boolean];

/**
 * React state that is mirrored to `localStorage`. SSR-safe — the first
 * render returns the `initialValue`, then a follow-up effect rehydrates
 * from storage and flips the `hydrated` flag.
 *
 * Mirrors the existing manual `useState` + `useEffect(localStorage.setItem)`
 * pattern but centralises the JSON parse / write / hydration logic.
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T
): UseLocalStorageStateResult<T> {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);
  const keyRef = useRef(key);

  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  // Hydrate once on mount. Subsequent renders read the latest value from state.
  useEffect(() => {
    setValue(readFromStorage<T>(keyRef.current, initialValue));
    setHydrated(true);
    // initialValue is intentionally read only on mount to avoid re-hydrating
    // when callers pass an inline object/array as the initial value.
  }, []);

  // Persist on every change after hydration.
  useEffect(() => {
    if (!hydrated) return;
    writeToStorage(keyRef.current, value);
  }, [hydrated, value]);

  const update = useCallback((next: Updater<T>) => {
    setValue((previous) => {
      const resolved = isUpdater(next) ? next(previous) : next;
      return resolved;
    });
  }, []);

  return [value, update, hydrated];
}
