'use client';

import { useTheme } from '../../hooks/useTheme';

type ThemeToggleProps = {
  language?: 'ms' | 'en';
};

export default function ThemeToggle({ language = 'ms' }: ThemeToggleProps) {
  const { theme, setTheme, hydrated } = useTheme();

  return (
    <div className="settings-language-row">
      <span>{language === 'ms' ? 'Mod gelap' : 'Dark mode'}</span>
      <div className="language-toggle compact" aria-label="Theme">
        <button
          type="button"
          className={hydrated && theme === 'light' ? 'active' : ''}
          onClick={() => setTheme('light')}
          aria-pressed={theme === 'light'}
          title={language === 'ms' ? 'Cahaya' : 'Light'}
        >
          ☀️
        </button>
        <button
          type="button"
          className={hydrated && theme === 'dark' ? 'active' : ''}
          onClick={() => setTheme('dark')}
          aria-pressed={theme === 'dark'}
          title={language === 'ms' ? 'Gelap' : 'Dark'}
        >
          🌙
        </button>
      </div>
    </div>
  );
}
