import React from 'react';
import { Box, Card, type CardProps } from '@mui/material';
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { alphaTokens } from '../../tokens/effects';
import { getElevationTokens } from '../../tokens/elevation';
import { motionTokens } from '../../tokens/motion';
import { radiusTokens } from '../../tokens/radius';
import { spacingTokens, toSpacingPx } from '../../tokens/spacing';

export interface CardShellProps extends Omit<CardProps, 'children' | 'onClick'> {
  children: React.ReactNode;
  interactive?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  accentColor?: string;
  padding?: 'default' | 'dense';
  contentSx?: SxProps<Theme>;
}

export const CardShell = React.forwardRef<HTMLDivElement, CardShellProps>(function CardShell({
  children,
  interactive,
  onClick,
  accentColor,
  padding = 'default',
  sx,
  contentSx,
  role,
  tabIndex,
  onKeyDown,
  ...props
}, ref) {
  const theme = useTheme();
  const baldin = (theme as Theme & { baldin?: Theme['baldin'] }).baldin;
  const isInteractive = interactive ?? Boolean(onClick);
  const resolvedAccent = accentColor ?? theme.palette.primary.main;
  const contentPadding = padding === 'dense'
    ? toSpacingPx(spacingTokens.cardPadding - 1)
    : toSpacingPx(spacingTokens.cardPadding);
  const radius = baldin?.radius.lg ?? radiusTokens.lg;
  const motion = baldin?.motion ?? motionTokens;
  const alphaConfig = baldin?.alpha ?? alphaTokens;
  const elevation = baldin?.elevation ?? getElevationTokens(theme);
  const cardSx = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: radius,
    borderLeft: accentColor ? `3px solid ${alpha(resolvedAccent, 0.5)}` : undefined,
    transition: [
      `transform ${motion.duration.standard}ms ${motion.easing.standard}`,
      `box-shadow ${motion.duration.standard}ms ${motion.easing.standard}`,
      `border-color ${motion.duration.standard}ms ${motion.easing.standard}`,
      `background-color ${motion.duration.standard}ms ${motion.easing.standard}`,
    ].join(', '),
    ...(isInteractive && {
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: elevation.cardHover(resolvedAccent),
        backgroundColor: alpha(theme.palette.action.hover, alphaConfig.hover),
        borderLeftColor: accentColor ? resolvedAccent : undefined,
      },
      '&:focus-visible': {
        outline: `2px solid ${alpha(theme.palette.primary.main, 0.6)}`,
        outlineOffset: 2,
      },
    }),
  } as SxProps<Theme>;
  const contentStyles = {
    p: contentPadding,
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  } as SxProps<Theme>;
  const mergedCardSx = (sx ? [cardSx, sx] : cardSx) as SxProps<Theme>;
  const mergedContentSx = (contentSx ? [contentStyles, contentSx] : contentStyles) as SxProps<Theme>;

  return (
    <Card
      {...props}
      ref={ref}
      role={role ?? (isInteractive ? 'button' : undefined)}
      tabIndex={tabIndex ?? (isInteractive ? 0 : undefined)}
      onClick={onClick}
      onKeyDown={onKeyDown}
      sx={mergedCardSx}
    >
      <Box
        sx={mergedContentSx}
      >
        {children}
      </Box>
    </Card>
  );
});

export default CardShell;
