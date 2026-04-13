import type { SxProps, Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { getStatusColors, type StatusColorKey } from '../../tokens/status';

export type StatusTone = StatusColorKey | undefined;
export type StatusChipEmphasis = 'soft' | 'outline' | 'solid';

export function resolveStatusColor(theme: Theme, tone: StatusTone): string {
  if (!tone) {
    return getStatusColors(theme).neutral;
  }

  const statusColors = getStatusColors(theme);
  return statusColors[tone];
}

export function getStatusChipSx(
  theme: Theme,
  tone: StatusTone,
  emphasis: StatusChipEmphasis = 'soft',
): SxProps<Theme> {
  const resolvedColor = resolveStatusColor(theme, tone);
  const isDark = theme.palette.mode === 'dark';

  if (emphasis === 'outline') {
    return {
      borderColor: alpha(resolvedColor, isDark ? 0.38 : 0.24),
      color: resolvedColor,
      backgroundColor: alpha(resolvedColor, isDark ? 0.08 : 0.04),
      '& .MuiChip-icon': {
        color: resolvedColor,
      },
    };
  }

  if (emphasis === 'solid') {
    const contrastText = theme.palette.getContrastText(resolvedColor);
    return {
      borderColor: 'transparent',
      backgroundColor: resolvedColor,
      color: contrastText,
      '& .MuiChip-icon': {
        color: contrastText,
      },
    };
  }

  return {
    borderColor: 'transparent',
    backgroundColor: alpha(resolvedColor, isDark ? 0.20 : 0.12),
    color: resolvedColor,
    '& .MuiChip-icon': {
      color: resolvedColor,
    },
  };
}

export function getStatusMetaSx(theme: Theme, tone: StatusTone): SxProps<Theme> {
  return {
    color: resolveStatusColor(theme, tone),
  };
}
