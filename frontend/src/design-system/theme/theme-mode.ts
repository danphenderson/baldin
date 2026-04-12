export type ThemeMode = 'dark' | 'light';

export const DEFAULT_THEME_MODE: ThemeMode = 'dark';
export const THEME_STORAGE_KEY = 'baldin_theme';

export function parseThemeMode(value: string | null | undefined): ThemeMode {
  return value === 'light' ? 'light' : DEFAULT_THEME_MODE;
}

export function toggleThemeMode(mode: ThemeMode): ThemeMode {
  return mode === 'dark' ? 'light' : 'dark';
}
