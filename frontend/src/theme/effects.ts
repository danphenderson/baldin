import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

/* ------------------------------------------------------------------ */
/*  Named alpha-opacity tiers                                          */
/*                                                                     */
/*  Use these constants instead of bare 0.04 / 0.08 / etc. so that    */
/*  opacity intent is readable and tiers stay consistent.              */
/* ------------------------------------------------------------------ */

/** Barely visible tint — very subtle hover backgrounds. */
export const ALPHA_SUBTLE = 0.04;

/** Light hover / focus state. */
export const ALPHA_HOVER = 0.08;

/** Chip / badge / tag background fills. */
export const ALPHA_CHIP = 0.12;

/** Active-state background tint or soft accent. */
export const ALPHA_ACTIVE = 0.14;

/** Visible borders, divider-strength opacity. */
export const ALPHA_BORDER = 0.3;

/* ------------------------------------------------------------------ */
/*  Gradient builders                                                  */
/*                                                                     */
/*  Each returns a CSS background string. Pass them directly to        */
/*  `background:` / `backgroundImage:` in an sx prop.                  */
/* ------------------------------------------------------------------ */

/** Bold primary → secondary brand gradient (logos, CTAs, avatar rings). */
export function brandGradient(theme: Theme): string {
  return `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`;
}

/** Muted / translucent version of the brand gradient for icon boxes and card headers. */
export function mutedGradient(theme: Theme, opacity = ALPHA_ACTIVE): string {
  return `linear-gradient(135deg, ${alpha(theme.palette.primary.main, opacity)}, ${alpha(theme.palette.secondary.main, opacity * 0.71)})`;
}

/** Sidebar background — dark gradient or light paper, theme-aware. */
export function sidebarGradient(theme: Theme): string {
  if (theme.palette.mode === 'dark') {
    const top = alpha(theme.palette.background.paper, 0.95);
    const bottom = theme.palette.background.default;
    return `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`;
  }
  return theme.palette.background.paper;
}

/** Auth layout radial background glow. */
export function authBackgroundGradient(theme: Theme): string {
  if (theme.palette.mode === 'dark') {
    return [
      `radial-gradient(ellipse at 20% 50%, ${alpha(theme.palette.primary.dark, 0.15)} 0%, transparent 50%)`,
      `radial-gradient(ellipse at 80% 20%, ${alpha(theme.palette.secondary.dark, 0.1)} 0%, transparent 50%)`,
      theme.palette.background.default,
    ].join(', ');
  }
  return theme.palette.background.default;
}

/** Accent-tinted gradient for status/domain-colored cards. */
export function accentGradient(color: string, opacity = 0.15): string {
  return `linear-gradient(135deg, ${alpha(color, opacity)}, ${alpha(color, opacity * 0.33)})`;
}

/**
 * JSON tree theme aligned to the Baldin palette.
 * Usable with `react-json-tree`'s `theme` prop.
 */
export function jsonTreeTheme(theme: Theme) {
  const p = theme.palette;
  return {
    scheme: 'baldin',
    base00: 'transparent',
    base01: p.mode === 'dark' ? '#1e293b' : '#e2e8f0',
    base02: p.mode === 'dark' ? '#334155' : '#cbd5e1',
    base03: p.mode === 'dark' ? '#64748b' : '#94a3b8',
    base04: p.mode === 'dark' ? '#94a3b8' : '#64748b',
    base05: p.mode === 'dark' ? '#cbd5e1' : '#334155',
    base06: p.mode === 'dark' ? '#e2e8f0' : '#1e293b',
    base07: p.text.primary,
    base08: p.error.main,
    base09: p.warning.main,
    base0A: p.warning.light,
    base0B: p.success.main,
    base0C: p.primary.main,
    base0D: p.primary.main,
    base0E: p.secondary.main,
    base0F: p.error.main,
  } as const;
}
