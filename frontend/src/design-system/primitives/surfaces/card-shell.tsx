import React from 'react';
import { Box, Card, type CardProps } from '@mui/material';
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { alphaTokens, stateOverlay } from '../../tokens/effects';
import { getElevationTokens } from '../../tokens/elevation';
import { motionTokens } from '../../tokens/motion';
import { radiusTokens, toRadiusPx } from '../../tokens/radius';
import { spacingTokens, toSpacingPx } from '../../tokens/spacing';

export type CardShellTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type CardShellSurface = 'base' | 'raised' | 'inset';
export type CardShellDensity = 'comfortable' | 'compact';

export interface CardShellProps extends Omit<CardProps, 'children' | 'onClick'> {
  children: React.ReactNode;
  interactive?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  tone?: CardShellTone;
  surface?: CardShellSurface;
  density?: CardShellDensity;
  contentSx?: SxProps<Theme>;
}

function resolveToneColor(theme: Theme, tone: CardShellTone): string {
  switch (tone) {
    case 'primary':
      return theme.palette.primary.main;
    case 'success':
      return theme.palette.success.main;
    case 'warning':
      return theme.palette.warning.main;
    case 'danger':
      return theme.palette.error.main;
    case 'info':
      return theme.palette.info.main;
    case 'neutral':
    default:
      return theme.palette.text.secondary;
  }
}

export const CardShell = React.forwardRef<HTMLDivElement, CardShellProps>(function CardShell({
  children,
  interactive,
  onClick,
  tone = 'neutral',
  surface = 'raised',
  density = 'comfortable',
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
  const resolvedTone = resolveToneColor(theme, tone);
  const contentPadding = density === 'compact'
    ? toSpacingPx(spacingTokens.cardPadding - 1)
    : toSpacingPx(spacingTokens.cardPadding);
  const radius = baldin?.radius.lg ?? radiusTokens.lg;
  const motion = baldin?.motion ?? motionTokens;
  const alphaConfig = baldin?.alpha ?? alphaTokens;
  const elevation = baldin?.elevation ?? getElevationTokens(theme);
  const surfaceTokens = baldin?.surface;
  const borderTokens = baldin?.border;
  const stateTokens = baldin?.state;
  const resolvedSurface = surfaceTokens?.[surface] ?? theme.palette.background.paper;
  const cardSx = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: toRadiusPx(radius),
    backgroundColor: resolvedSurface,
    border: `1px solid ${borderTokens?.default ?? theme.palette.divider}`,
    borderInlineStart: tone === 'neutral' ? undefined : `3px solid ${alpha(resolvedTone, 0.52)}`,
    transition: [
      `transform ${motion.duration.standard}ms ${motion.easing.standard}`,
      `box-shadow ${motion.duration.standard}ms ${motion.easing.standard}`,
      `border-color ${motion.duration.standard}ms ${motion.easing.standard}`,
      `background-color ${motion.duration.standard}ms ${motion.easing.standard}`,
      `background-image ${motion.duration.standard}ms ${motion.easing.standard}`,
    ].join(', '),
    ...(isInteractive && {
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-1px)',
        boxShadow: elevation.cardHover(resolvedTone, tone === 'neutral' ? 0.10 : 0.16),
        borderColor: tone === 'neutral'
          ? borderTokens?.strong ?? theme.palette.divider
          : borderTokens?.accent ?? alpha(resolvedTone, 0.28),
        backgroundImage: stateOverlay(stateTokens?.hover ?? alpha(theme.palette.action.hover, alphaConfig.hover)),
      },
      '&:active': {
        transform: 'translateY(0)',
        backgroundImage: stateOverlay(stateTokens?.pressed ?? stateTokens?.hover ?? alpha(theme.palette.action.hover, alphaConfig.hover)),
      },
      '&:focus-visible': {
        outline: 'none',
        borderColor: tone === 'neutral'
          ? borderTokens?.strong ?? theme.palette.primary.main
          : borderTokens?.accent ?? theme.palette.primary.main,
        boxShadow: `0 0 0 4px ${stateTokens?.focusRing ?? alpha(theme.palette.primary.main, 0.18)}`,
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
  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    onKeyDown?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (!isInteractive || !onClick) {
      return;
    }

    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  return (
    <Card
      {...props}
      ref={ref}
      role={role ?? (isInteractive ? 'button' : undefined)}
      tabIndex={tabIndex ?? (isInteractive ? 0 : undefined)}
      onClick={onClick}
      onKeyDown={handleKeyDown}
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
