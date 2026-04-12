import { alpha, type Theme } from '@mui/material/styles';

export const ALPHA_SUBTLE = 0.04;
export const ALPHA_HOVER = 0.08;
export const ALPHA_CHIP = 0.12;
export const ALPHA_ACTIVE = 0.14;
export const ALPHA_BORDER = 0.3;

export const alphaTokens = {
  subtle: ALPHA_SUBTLE,
  hover: ALPHA_HOVER,
  chip: ALPHA_CHIP,
  active: ALPHA_ACTIVE,
  border: ALPHA_BORDER,
} as const;

export type AlphaTokens = typeof alphaTokens;

export function brandGradient(theme: Theme, angle = 135, reverse = false): string {
  const start = reverse ? theme.palette.secondary.main : theme.palette.primary.main;
  const end = reverse ? theme.palette.primary.main : theme.palette.secondary.main;
  return `linear-gradient(${angle}deg, ${start}, ${end})`;
}

export function brandHoverGradient(theme: Theme, angle = 135, reverse = false): string {
  const start = reverse ? theme.palette.secondary.dark : theme.palette.primary.dark;
  const end = reverse ? theme.palette.primary.dark : theme.palette.secondary.dark;
  return `linear-gradient(${angle}deg, ${start}, ${end})`;
}

export function softBrandGradient(
  theme: Theme,
  options: {
    angle?: number;
    startOpacity?: number;
    endOpacity?: number;
    startTone?: 'light' | 'main' | 'dark';
    endTone?: 'light' | 'main' | 'dark';
    reverse?: boolean;
  } = {},
): string {
  const modeTone = theme.palette.mode === 'dark' ? 'dark' : 'light';
  const {
    angle = 135,
    startOpacity = theme.palette.mode === 'dark' ? 0.18 : 0.08,
    endOpacity = theme.palette.mode === 'dark' ? 0.1 : 0.05,
    startTone = modeTone,
    endTone = modeTone,
    reverse = false,
  } = options;

  const startColor = reverse ? theme.palette.secondary[startTone] : theme.palette.primary[startTone];
  const endColor = reverse ? theme.palette.primary[endTone] : theme.palette.secondary[endTone];

  return `linear-gradient(${angle}deg, ${alpha(startColor, startOpacity)}, ${alpha(endColor, endOpacity)})`;
}

export function mutedGradient(theme: Theme, opacity = ALPHA_ACTIVE): string {
  return softBrandGradient(theme, {
    startTone: 'main',
    endTone: 'main',
    startOpacity: opacity,
    endOpacity: opacity * 0.71,
  });
}

export function cardSurfaceGradient(theme: Theme, angle = 135): string {
  if (theme.palette.mode === 'dark') {
    return `linear-gradient(${angle}deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`;
  }

  return theme.palette.background.paper;
}

export function sidebarGradient(theme: Theme): string {
  if (theme.palette.mode === 'dark') {
    const top = alpha(theme.palette.background.paper, 0.95);
    const bottom = theme.palette.background.default;
    return `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`;
  }
  return theme.palette.background.paper;
}

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

export function accentGradient(
  color: string,
  options: {
    angle?: number;
    startOpacity?: number;
    endOpacity?: number;
    startStop?: string;
    endStop?: string;
  } = {},
): string {
  const {
    angle = 135,
    startOpacity = 0.15,
    endOpacity = startOpacity * 0.33,
    startStop = '0%',
    endStop = '100%',
  } = options;

  return `linear-gradient(${angle}deg, ${alpha(color, startOpacity)} ${startStop}, ${alpha(color, endOpacity)} ${endStop})`;
}

export function progressGradient(color: string, angle = 90): string {
  return `linear-gradient(${angle}deg, ${alpha(color, 0.68)} 0%, ${color} 100%)`;
}
