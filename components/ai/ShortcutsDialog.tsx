'use client';

import { useEffect, useState } from 'react';

type Shortcut = {
  combo: string;
  descriptionMs: string;
  descriptionEn: string;
};

const SHORTCUTS: Shortcut[] = [
  { combo: '?', descriptionMs: 'Tunjuk kekunci pintas', descriptionEn: 'Show keyboard shortcuts' },
  { combo: 'Esc', descriptionMs: 'Tutup panel', descriptionEn: 'Close panel' },
  { combo: 'Ctrl + K', descriptionMs: 'Buka command search', descriptionEn: 'Open command search' },
  { combo: 'Ctrl + Shift + T', descriptionMs: 'Tukar tema terang / gelap', descriptionEn: 'Toggle light / dark theme' },
  { combo: '/', descriptionMs: 'Fokus pada input chat', descriptionEn: 'Focus chat input' }
];

type ShortcutsDialogProps = {
  language?: 'ms' | 'en';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Minimal `?` keyboard-shortcut overlay. Listens for `?` globally and
 * toggles visibility. Shows a friendly table of shortcuts.
 */
export default function ShortcutsDialog({ language = 'ms', open, onOpenChange }: ShortcutsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const visible = isControlled ? Boolean(open) : internalOpen;
  const setVisible = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const isMs = language === 'ms';

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT';
      if (event.key === 'Escape' && visible) {
        setVisible(false);
        return;
      }
      if (isTyping) return;
      if (event.key === '?') {
        event.preventDefault();
        setVisible(!visible);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="shortcuts-dialog" role="dialog" aria-modal="true" aria-label={isMs ? 'Kekunci pintas' : 'Keyboard shortcuts'}>
      <button
        type="button"
        className="shortcuts-dialog__backdrop"
        aria-label={isMs ? 'Tutup' : 'Close'}
        onClick={() => setVisible(false)}
      />
      <div className="shortcuts-dialog__card">
        <div className="shortcuts-dialog__header">
          <h3>{isMs ? 'Kekunci Pintas' : 'Keyboard Shortcuts'}</h3>
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label={isMs ? 'Tutup' : 'Close'}
            className="shortcuts-dialog__close"
          >
            ×
          </button>
        </div>
        <ul className="shortcuts-dialog__list">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.combo}>
              <kbd>{shortcut.combo}</kbd>
              <span>{isMs ? shortcut.descriptionMs : shortcut.descriptionEn}</span>
            </li>
          ))}
        </ul>
        <p className="shortcuts-dialog__hint">
          {isMs ? 'Tekan ? bila-bila untuk tunjuk panduan ini.' : 'Press ? anytime to show this guide.'}
        </p>
      </div>
    </div>
  );
}
