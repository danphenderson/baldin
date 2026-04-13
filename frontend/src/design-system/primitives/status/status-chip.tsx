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
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  tone,
  emphasis = 'soft',
  size = 'small',
  sx,
  ...props
}) => {
  const theme = useTheme();
  const pillRadius = (theme as Theme & { baldin?: Theme['baldin'] }).baldin?.radius.pill ?? radiusTokens.pill;
  const chipSx = {
    fontWeight: 600,
    borderRadius: toRadiusPx(pillRadius),
    ...getStatusChipSx(theme, tone, emphasis),
  } as SxProps<Theme>;
  const mergedSx = (sx ? [chipSx, sx] : chipSx) as SxProps<Theme>;

  return (
    <Chip
      {...props}
      size={size}
      variant={emphasis === 'outline' ? 'outlined' : 'filled'}
      sx={mergedSx}
    />
  );
};

export default StatusChip;
