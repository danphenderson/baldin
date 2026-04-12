import type { PaletteOptions } from '@mui/material/styles';
import type { ThemeMode } from '../theme/theme-mode';

const COLOR_TOKENS = {
  dark: {
    brand: {
      primary: { main: '#06b6d4', light: '#22d3ee', dark: '#0891b2' },
      secondary: { main: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed' },
    },
    surface: '#111827',
    surfaceAlt: '#0f172a',
    background: '#0a0e1a',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    divider: 'rgba(148, 163, 184, 0.12)',
    borderSubtle: 'rgba(148, 163, 184, 0.08)',
    focus: '#22d3ee',
    success: { main: '#10b981', light: '#34d399', dark: '#059669' },
    warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
    error: { main: '#f43f5e', light: '#fb7185', dark: '#e11d48' },
    info: { main: '#29b6f6', light: '#4fc3f7', dark: '#0288d1' },
  },
  light: {
    brand: {
      primary: { main: '#0891b2', light: '#06b6d4', dark: '#0e7490' },
      secondary: { main: '#7c3aed', light: '#8b5cf6', dark: '#6d28d9' },
    },
    surface: '#ffffff',
    surfaceAlt: '#f1f5f9',
    background: '#f8fafc',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    divider: 'rgba(0, 0, 0, 0.12)',
    borderSubtle: 'rgba(15, 23, 42, 0.08)',
    focus: '#0891b2',
    success: { main: '#059669', light: '#10b981', dark: '#047857' },
    warning: { main: '#d97706', light: '#f59e0b', dark: '#b45309' },
    error: { main: '#e11d48', light: '#f43f5e', dark: '#be123c' },
    info: { main: '#0288d1', light: '#03a9f4', dark: '#01579b' },
  },
} as const;

export type ColorTokens = (typeof COLOR_TOKENS)[keyof typeof COLOR_TOKENS];

export function getColorTokens(mode: ThemeMode): ColorTokens {
  return COLOR_TOKENS[mode];
}

export function getPaletteOptions(mode: ThemeMode): PaletteOptions {
  const colors = getColorTokens(mode);

  return {
    mode,
    primary: colors.brand.primary,
    secondary: colors.brand.secondary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    background: {
      default: colors.background,
      paper: colors.surface,
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
    },
    divider: colors.divider,
  };
}
