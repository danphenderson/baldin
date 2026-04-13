import { alpha, type PaletteOptions } from '@mui/material/styles';
import type { ThemeMode } from '../theme/theme-mode';

const COLOR_TOKENS = {
  dark: {
    brand: {
      primary: { main: '#06b6d4', light: '#67e8f9', dark: '#0891b2' },
      secondary: { main: '#5b7cfa', light: '#8aa0ff', dark: '#3654cb' },
    },
    surface: {
      canvas: '#07111d',
      base: '#0d1828',
      raised: '#132235',
      inset: '#091421',
      overlay: '#18273c',
    },
    textPrimary: '#e7eef8',
    textSecondary: '#93a5bd',
    border: {
      subtle: 'rgba(147, 165, 189, 0.10)',
      default: 'rgba(147, 165, 189, 0.18)',
      strong: 'rgba(147, 165, 189, 0.28)',
      accent: alpha('#06b6d4', 0.34),
    },
    state: {
      hover: 'rgba(231, 238, 248, 0.04)',
      selected: alpha('#06b6d4', 0.14),
      pressed: alpha('#06b6d4', 0.2),
      focusRing: alpha('#67e8f9', 0.28),
    },
    focus: '#67e8f9',
    success: { main: '#10b981', light: '#34d399', dark: '#059669' },
    warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
    error: { main: '#f43f5e', light: '#fb7185', dark: '#e11d48' },
    info: { main: '#38bdf8', light: '#7dd3fc', dark: '#0284c7' },
  },
  light: {
    brand: {
      primary: { main: '#0891b2', light: '#06b6d4', dark: '#0e7490' },
      secondary: { main: '#4365ea', light: '#6f88f3', dark: '#2f4ebd' },
    },
    surface: {
      canvas: '#f3f7fb',
      base: '#eef4fa',
      raised: '#ffffff',
      inset: '#e7eef7',
      overlay: '#ffffff',
    },
    textPrimary: '#0f172a',
    textSecondary: '#51647c',
    border: {
      subtle: 'rgba(15, 23, 42, 0.08)',
      default: 'rgba(15, 23, 42, 0.12)',
      strong: 'rgba(15, 23, 42, 0.18)',
      accent: alpha('#0891b2', 0.22),
    },
    state: {
      hover: 'rgba(15, 23, 42, 0.035)',
      selected: alpha('#0891b2', 0.10),
      pressed: alpha('#0891b2', 0.14),
      focusRing: alpha('#06b6d4', 0.22),
    },
    focus: '#0891b2',
    success: { main: '#059669', light: '#10b981', dark: '#047857' },
    warning: { main: '#d97706', light: '#f59e0b', dark: '#b45309' },
    error: { main: '#e11d48', light: '#f43f5e', dark: '#be123c' },
    info: { main: '#0284c7', light: '#38bdf8', dark: '#0369a1' },
  },
} as const;

export type ColorTokens = (typeof COLOR_TOKENS)[keyof typeof COLOR_TOKENS];
export type SurfaceTokens = ColorTokens['surface'];
export type BorderTokens = ColorTokens['border'];
export type StateTokens = ColorTokens['state'];

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
      default: colors.surface.canvas,
      paper: colors.surface.raised,
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
    },
    divider: colors.border.default,
    action: {
      hover: colors.state.hover,
      selected: colors.state.selected,
      focus: colors.state.focusRing,
      active: colors.textSecondary,
    },
  };
}
