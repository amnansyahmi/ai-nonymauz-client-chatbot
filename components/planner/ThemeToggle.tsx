'use client';

import { useTheme } from '../../hooks/useTheme';
import { MoonIcon, SunIcon } from './icons';

type ThemeToggleProps = {
  label?: string;
};

export default function ThemeToggle({ label = 'Toggle theme' }: ThemeToggleProps) {
  const { theme, toggle, hydrated } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={label}
      title={label}
      data-event="toggle_theme"
    >
      {!hydrated ? (
        <SunIcon size={18} />
      ) : theme === 'dark' ? (
        <SunIcon size={18} />
      ) : (
        <MoonIcon size={18} />
      )}
    </button>
  );
}
