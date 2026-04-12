import { alpha, type Theme } from '@mui/material/styles';

export function getElevationTokens(theme: Theme) {
  return {
    flat: 'none',
    raised: `0 4px 20px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.2 : 0.12)}`,
    floating: `0 8px 32px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.28 : 0.2)}`,
    interactive: (color: string, opacity = 0.18) => `0 4px 20px ${alpha(color, opacity)}`,
    cardHover: (color: string, opacity = 0.12) => `0 10px 24px ${alpha(color, opacity)}`,
    focusRing: (color: string, opacity = 0.12, spread = 4) => `0 0 0 ${spread}px ${alpha(color, opacity)}`,
  } as const;
}

export type ElevationTokens = ReturnType<typeof getElevationTokens>;
