'use client';

import { useEffect, useRef } from 'react';

export type PushToTalkHotkeyOptions = {
  enabled: boolean;
  onPress: () => void;
  onRelease: () => void;
  /** Defaults to ' ' (space). */
  key?: string;
};

type KeyCheck = {
  key: string;
  repeat: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
};

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function shouldIgnoreKey(event: KeyCheck, hotkey: string = ' '): boolean {
  if (event.repeat) return true;
  if (event.ctrlKey || event.metaKey || event.altKey) return true;
  if (event.key !== hotkey) return true;
  if (isEditableTarget(event.target)) return true;
  return false;
}

/**
 * Hold-to-talk hotkey. Listens for keydown/keyup on the document and treats
 * the configured key as a momentary "push-to-talk" trigger. On desktop this
 * gives a fast, keyboard-only workflow; on mobile the listener is harmless
 * because the key event never fires.
 *
 * The handler is skipped when the user is typing in an input, textarea, or
 * contentEditable element so the spacebar still works as expected in normal
 * form fields.
 */
export function usePushToTalkHotkey({
  enabled,
  onPress,
  onRelease,
  key = ' '
}: PushToTalkHotkeyOptions): void {
  const pressedRef = useRef(false);
  const onPressRef = useRef(onPress);
  const onReleaseRef = useRef(onRelease);
  onPressRef.current = onPress;
  onReleaseRef.current = onRelease;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreKey(event, key)) return;
      pressedRef.current = true;
      event.preventDefault();
      onPressRef.current();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key !== key) return;
      if (!pressedRef.current) return;
      pressedRef.current = false;
      event.preventDefault();
      onReleaseRef.current();
    };

    const handleBlur = () => {
      if (pressedRef.current) {
        pressedRef.current = false;
        onReleaseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [enabled, key]);
}
