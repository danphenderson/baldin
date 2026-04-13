import React from 'react';
import { Box, Button, Typography, type ButtonProps } from '@mui/material';
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { spacingTokens, toSpacingPx } from '../../tokens/spacing';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactElement;
  buttonProps?: Omit<ButtonProps, 'children' | 'onClick' | 'startIcon'>;
}

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  action?: EmptyStateAction;
  layout?: 'page' | 'section';
  compact?: boolean;
  sx?: SxProps<Theme>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  primaryAction,
  action,
  layout = 'page',
  compact = false,
  sx,
}) => {
  const theme = useTheme();
  const baldin = (theme as Theme & { baldin?: Theme['baldin'] }).baldin;
  const resolvedAction = primaryAction ?? action;
  const isPageLayout = layout === 'page';
  const iconSize = compact ? 48 : isPageLayout ? 72 : 56;
  const selectedState = baldin?.state.selected ?? alpha(theme.palette.primary.main, 0.08);
  const accentBorder = baldin?.border.accent ?? alpha(theme.palette.primary.main, 0.16);
  const rootSx = {
    textAlign: 'center',
    py: toSpacingPx(isPageLayout ? (compact ? 8 : 10) : (compact ? 5 : 6)),
    px: toSpacingPx(2),
  } as SxProps<Theme>;
  const mergedSx = (sx ? [rootSx, sx] : rootSx) as SxProps<Theme>;

  return (
    <Box sx={mergedSx}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: iconSize,
          height: iconSize,
          borderRadius: '50%',
          mb: toSpacingPx(compact ? 3 : 4),
          color: theme.palette.primary.main,
          backgroundColor: selectedState,
          border: `1px solid ${accentBorder}`,
          boxShadow: `0 10px 30px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.08)}`,
          '& svg': {
            fontSize: compact ? 24 : isPageLayout ? 32 : 28,
          },
        }}
      >
        {icon}
      </Box>

      <Typography
        variant={isPageLayout ? 'h5' : 'body1'}
        color="text.primary"
        fontWeight={700}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: toSpacingPx(1),
            mb: resolvedAction ? toSpacingPx(compact ? 3 : 4) : 0,
            maxWidth: isPageLayout ? 420 : 340,
            mx: 'auto',
            lineHeight: 1.6,
          }}
        >
          {description}
        </Typography>
      )}

      {resolvedAction && (
        <Button
          variant={isPageLayout ? 'outlined' : 'text'}
          size={compact ? 'small' : 'medium'}
          startIcon={resolvedAction.icon}
          onClick={resolvedAction.onClick}
          {...resolvedAction.buttonProps}
        >
          {resolvedAction.label}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
