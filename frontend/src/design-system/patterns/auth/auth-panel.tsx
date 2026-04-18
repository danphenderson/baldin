import React from 'react';
import { Box, Typography } from '@mui/material';
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { CardShell } from '../../primitives/surfaces/card-shell';
import { brandGradient } from '../../tokens/effects';
import { radiusTokens, toRadiusPx } from '../../tokens/radius';
import { spacingTokens, toSpacingPx } from '../../tokens/spacing';

export interface AuthPanelProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number | string;
  sx?: SxProps<Theme>;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({
  icon,
  title,
  description,
  children,
  footer,
  maxWidth = 480,
  sx,
}) => {
  const theme = useTheme();
  const iconRadius = (theme as typeof theme & { baldin?: typeof theme.baldin }).baldin?.radius.xl
    ?? radiusTokens.xl;
  const rootSx = {
    width: '100%',
    maxWidth,
    px: toSpacingPx(2),
  } as SxProps<Theme>;
  const mergedRootSx = (sx ? [rootSx, sx] : rootSx) as SxProps<Theme>;

  return (
    <Box sx={mergedRootSx}>
      <Box sx={{ textAlign: 'center', mb: toSpacingPx(6) }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: toRadiusPx(iconRadius),
            mx: 'auto',
            mb: toSpacingPx(3),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: brandGradient(theme),
            color: 'common.white',
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
            '& svg': {
              fontSize: 28,
            },
          }}
        >
          {icon}
        </Box>
        {typeof title === 'string' ? (
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            {title}
          </Typography>
        ) : title}
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>

      <CardShell
        surface="raised"
        contentSx={{
          p: toSpacingPx(spacingTokens.dialogPadding),
          gap: toSpacingPx(4),
        }}
        sx={{
          boxShadow: `0 8px 40px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.24 : 0.2)}`,
        }}
      >
        {children}
      </CardShell>

      {footer && (
        <Box sx={{ textAlign: 'center', mt: toSpacingPx(4) }}>
          {footer}
        </Box>
      )}
    </Box>
  );
};

export default AuthPanel;
