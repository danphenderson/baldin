import React from 'react';
import { Chip, type ChipProps } from '@mui/material';
import { useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { radiusTokens, toRadiusPx } from '../../tokens/radius';
import { getStatusChipSx, type StatusChipEmphasis, type StatusTone } from './helpers';

export interface StatusChipProps extends Omit<ChipProps, 'color' | 'icon' | 'label' | 'size' | 'variant'> {
  label: React.ReactNode;
  icon?: React.ReactElement;
  tone?: StatusTone;
  emphasis?: StatusChipEmphasis;
  component?: React.ElementType;
  href?: string;
  color?: ChipProps['color'];
  size?: 'small' | 'medium';
  variant?: ChipProps['variant'];
  sx?: SxProps<Theme>;
}

function mapColorToTone(color?: ChipProps['color']): StatusTone {
  switch (color) {
    case 'default':
      return 'neutral';
    case 'primary':
      return 'primary';
    case 'secondary':
      return 'secondary';
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'danger';
    case 'info':
      return 'info';
    default:
      return undefined;
  }
}

export const StatusChip: React.FC<StatusChipProps> = ({
  tone,
  emphasis,
  color,
  size = 'small',
  variant,
  sx,
  ...props
}) => {
  const theme = useTheme();
  const pillRadius = (theme as Theme & { baldin?: Theme['baldin'] }).baldin?.radius.pill ?? radiusTokens.pill;
  const resolvedTone = tone ?? mapColorToTone(color);
  const resolvedEmphasis = emphasis
    ?? (variant === 'outlined' ? 'outline' : variant === 'filled' ? 'solid' : 'soft');
  const chipSx = {
    fontWeight: 600,
    borderRadius: toRadiusPx(pillRadius),
    ...getStatusChipSx(theme, resolvedTone, resolvedEmphasis),
  } as SxProps<Theme>;
  const mergedSx = (sx ? [chipSx, sx] : chipSx) as SxProps<Theme>;

  return (
    <Chip
      {...props}
      size={size}
      variant={resolvedEmphasis === 'outline' ? 'outlined' : 'filled'}
      sx={mergedSx}
    />
  );
};

export default StatusChip;
