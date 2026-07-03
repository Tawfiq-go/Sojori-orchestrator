export const USER_LANGUAGE_STORAGE_KEY = 'selectedLanguage';

export const UI_LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
] as const;

export type UiLanguageCode = (typeof UI_LANGUAGES)[number]['code'];

export function readSavedUiLanguage(): UiLanguageCode {
  if (typeof window === 'undefined') return 'fr';
  const saved = localStorage.getItem(USER_LANGUAGE_STORAGE_KEY);
  return saved === 'en' ? 'en' : 'fr';
}

export function persistUiLanguage(code: UiLanguageCode): void {
  localStorage.setItem(USER_LANGUAGE_STORAGE_KEY, code);
}

export function uiLanguageLabel(code: string): string {
  return UI_LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}
