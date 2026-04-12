import React from 'react';
import { Chip, type ChipProps } from '@mui/material';
import { useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { radiusTokens } from '../../tokens/radius';
import { getStatusChipSx, type StatusToneColor } from './helpers';

export interface StatusChipProps extends Omit<ChipProps, 'color' | 'icon' | 'label' | 'size' | 'variant'> {
  label: React.ReactNode;
  icon?: React.ReactElement;
  color?: StatusToneColor;
  variant?: 'filled' | 'outlined';
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  color,
  variant = 'filled',
  size = 'small',
  sx,
  ...props
}) => {
  const theme = useTheme();
  const pillRadius = (theme as Theme & { baldin?: Theme['baldin'] }).baldin?.radius.pill ?? radiusTokens.pill;
  const chipSx = {
    fontWeight: 600,
    borderRadius: pillRadius,
    ...getStatusChipSx(theme, color, variant),
  } as SxProps<Theme>;
  const mergedSx = (sx ? [chipSx, sx] : chipSx) as SxProps<Theme>;

  return (
    <Chip
      {...props}
      size={size}
      variant={variant}
      sx={mergedSx}
    />
  );
};

export default StatusChip;
