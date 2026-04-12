import type { SxProps, Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { getStatusColors, type StatusColorKey } from '../../tokens/status';

export type StatusToneColor = StatusColorKey | string | undefined;

export function resolveStatusColor(theme: Theme, color: StatusToneColor): string {
  if (!color) {
    return theme.palette.text.secondary;
  }

  const statusColors = getStatusColors(theme);
  return color in statusColors
    ? statusColors[color as StatusColorKey]
    : color;
}

export function getStatusChipSx(
  theme: Theme,
  color: StatusToneColor,
  variant: 'filled' | 'outlined' = 'filled',
): SxProps<Theme> {
  const resolvedColor = resolveStatusColor(theme, color);

  if (variant === 'outlined') {
    return {
      borderColor: alpha(resolvedColor, theme.palette.mode === 'dark' ? 0.42 : 0.28),
      color: resolvedColor,
      backgroundColor: alpha(resolvedColor, theme.palette.mode === 'dark' ? 0.08 : 0.04),
      '& .MuiChip-icon': {
        color: resolvedColor,
      },
    };
  }

  return {
    backgroundColor: alpha(resolvedColor, theme.palette.mode === 'dark' ? 0.22 : 0.12),
    color: resolvedColor,
    '& .MuiChip-icon': {
      color: resolvedColor,
    },
  };
}

export function getStatusMetaSx(theme: Theme, color: StatusToneColor): SxProps<Theme> {
  return {
    color: resolveStatusColor(theme, color),
  };
}
