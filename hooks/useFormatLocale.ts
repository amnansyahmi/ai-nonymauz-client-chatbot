import type { AppLanguage } from '../components/planner/types';

const LOCALE_MAP: Record<AppLanguage, string> = {
  ms: 'ms-MY',
  en: 'en-MY'
};

/**
 * Returns the BCP-47 locale string for the active app language. Used by
 * `toLocaleString` / `toLocaleDateString` calls so date and number formatting
 * matches the user's language preference.
 */
export function useFormatLocale(language: AppLanguage): string {
  return LOCALE_MAP[language] ?? 'en-MY';
}
