import React from 'react';
import { Card, CardContent, type CardContentProps, type CardProps } from '@mui/material';
import { useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { radiusTokens, toRadiusPx } from '../../tokens/radius';
import { spacingTokens, toSpacingPx } from '../../tokens/spacing';

export interface SurfaceCardProps extends CardProps {
  sx?: SxProps<Theme>;
}

export const SurfaceCard = React.forwardRef<HTMLDivElement, SurfaceCardProps>(function SurfaceCard(
  { sx, ...props },
  ref,
) {
  const theme = useTheme();
  const baldin = (theme as Theme & { baldin?: Theme['baldin'] }).baldin;
  const cardSx = {
    borderRadius: toRadiusPx(baldin?.radius.lg ?? radiusTokens.lg),
    backgroundColor: baldin?.surface.raised ?? theme.palette.background.paper,
    border: `1px solid ${baldin?.border.default ?? theme.palette.divider}`,
  } as SxProps<Theme>;

  const mergedSx = (sx
    ? [cardSx, ...(Array.isArray(sx) ? sx : [sx])]
    : cardSx) as SxProps<Theme>;

  return <Card ref={ref} {...props} sx={mergedSx} />;
});

export interface SurfaceCardContentProps extends CardContentProps {
  density?: 'comfortable' | 'compact' | 'spacious';
  centered?: boolean;
  sx?: SxProps<Theme>;
}

export const SurfaceCardContent: React.FC<SurfaceCardContentProps> = ({
  density = 'comfortable',
  centered = false,
  sx,
  ...props
}) => {
  const padding = density === 'compact'
    ? toSpacingPx(spacingTokens.cardPadding - 1)
    : density === 'spacious'
      ? toSpacingPx(spacingTokens.cardPadding + 1)
      : toSpacingPx(spacingTokens.cardPadding);
  const contentSx = {
    p: padding,
    '&:last-child': {
      pb: padding,
    },
    ...(centered
      ? {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }
      : {}),
  } as SxProps<Theme>;

  const mergedSx = (sx
    ? [contentSx, ...(Array.isArray(sx) ? sx : [sx])]
    : contentSx) as SxProps<Theme>;

  return <CardContent {...props} sx={mergedSx} />;
};

export default SurfaceCard;
