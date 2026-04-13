import React from 'react';
import { Alert, Fade, type AlertColor } from '@mui/material';
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { motionTokens } from '../../tokens/motion';
import { radiusTokens, toRadiusPx } from '../../tokens/radius';
import { spacingTokens, toSpacingPx } from '../../tokens/spacing';

export interface InlineFeedbackProps {
  tone: AlertColor;
  children: React.ReactNode;
  onClose?: () => void;
  variant?: 'soft' | 'outlined' | 'filled';
  transition?: 'none' | 'fade';
  density?: 'default' | 'compact';
  sx?: SxProps<Theme>;
}

function getToneColor(theme: Theme, tone: AlertColor): string {
  switch (tone) {
    case 'error':
      return theme.palette.error.main;
    case 'warning':
      return theme.palette.warning.main;
    case 'success':
      return theme.palette.success.main;
    case 'info':
    default:
      return theme.palette.info.main;
  }
}

export const InlineFeedback: React.FC<InlineFeedbackProps> = ({
  tone,
  children,
  onClose,
  variant = 'soft',
  transition = 'fade',
  density = 'default',
  sx,
}) => {
  const theme = useTheme();
  const baldin = (theme as Theme & { baldin?: Theme['baldin'] }).baldin;
  const toneColor = getToneColor(theme, tone);
  const compact = density === 'compact';
  const outlinedBorder = alpha(toneColor, theme.palette.mode === 'dark' ? 0.34 : 0.2);
  const alertSx = {
    width: '100%',
    borderRadius: toRadiusPx(baldin?.radius.lg ?? radiusTokens.lg),
    alignItems: 'flex-start',
    px: compact ? toSpacingPx(3) : toSpacingPx(4),
    py: compact ? toSpacingPx(1.5) : toSpacingPx(2),
    '& .MuiAlert-icon': {
      color: variant === 'filled' ? undefined : toneColor,
      pt: compact ? '2px' : '4px',
    },
    '& .MuiAlert-message': {
      width: '100%',
      py: 0,
    },
    '& .MuiAlert-action': {
      pt: compact ? '2px' : '4px',
      pr: 0,
    },
    ...(variant === 'soft' ? {
      color: theme.palette.text.primary,
      backgroundColor: alpha(toneColor, theme.palette.mode === 'dark' ? 0.14 : 0.09),
      border: `1px solid ${outlinedBorder}`,
    } : {}),
    ...(variant === 'outlined' ? {
      borderColor: outlinedBorder,
      backgroundColor: theme.baldin.surface.inset,
    } : {}),
    ...(variant === 'filled' ? {
      borderColor: 'transparent',
    } : {}),
    ...(compact ? {
      minHeight: toSpacingPx(spacingTokens.base * 2),
    } : {}),
  } as SxProps<Theme>;
  const mergedAlertSx = (sx ? [alertSx, sx] : alertSx) as SxProps<Theme>;

  const content = (
    <Alert
      severity={tone}
      variant={variant === 'soft' ? 'standard' : variant}
      onClose={onClose}
      sx={mergedAlertSx}
    >
      {children}
    </Alert>
  );

  if (transition === 'none') {
    return content;
  }

  return (
    <Fade
      in
      appear
      timeout={baldin?.motion.duration.standard ?? motionTokens.duration.standard}
    >
      <div>{content}</div>
    </Fade>
  );
};

export default InlineFeedback;
