'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { safeJsonParse } from '../../components/planner/utils';

export type UseLocalStorageOptions<T> = {
  serialize?: (value: T) => string;
  deserialize?: (raw: string) => T;
  skipInitialEffect?: boolean;
};

export function useLocalStorage<T>(
  key: string,
  initial: T | (() => T),
  options: UseLocalStorageOptions<T> = {}
): [T, (value: T | ((current: T) => T)) => void, boolean] {
  const serialize = options.serialize ?? ((value: T) => JSON.stringify(value));
  const deserialize = options.deserialize ?? ((raw: string) => safeJsonParse<T>(raw, initial as T));
  const initialRef = useRef(false);

  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return typeof initial === 'function' ? (initial as () => T)() : initial;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) {
        return typeof initial === 'function' ? (initial as () => T)() : initial;
      }
      return deserialize(raw);
    } catch {
      return typeof initial === 'function' ? (initial as () => T)() : initial;
    }
  });

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    initialRef.current = true;
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (options.skipInitialEffect && !initialRef.current) return;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, serialize(value));
    } catch {}
  }, [key, serialize, value, options.skipInitialEffect]);

  const update = useCallback((next: T | ((current: T) => T)) => {
    setValue((current) => (typeof next === 'function' ? (next as (current: T) => T)(current) : next));
  }, []);

  return [value, update, hydrated];
}
