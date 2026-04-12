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
  layout?: 'page' | 'section';
  compact?: boolean;
  sx?: SxProps<Theme>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  primaryAction,
  layout = 'page',
  compact = false,
  sx,
}) => {
  const theme = useTheme();
  const isPageLayout = layout === 'page';
  const iconSize = compact ? 48 : isPageLayout ? 72 : 56;
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
          backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.08),
          '& svg': {
            fontSize: compact ? 24 : isPageLayout ? 32 : 28,
          },
        }}
      >
        {icon}
      </Box>

      <Typography
        variant={isPageLayout ? 'h6' : 'body1'}
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
            mb: primaryAction ? toSpacingPx(compact ? 3 : 4) : 0,
            maxWidth: isPageLayout ? 420 : 340,
            mx: 'auto',
            lineHeight: 1.6,
          }}
        >
          {description}
        </Typography>
      )}

      {primaryAction && (
        <Button
          variant={isPageLayout ? 'outlined' : 'text'}
          size={compact ? 'small' : 'medium'}
          startIcon={primaryAction.icon}
          onClick={primaryAction.onClick}
          {...primaryAction.buttonProps}
        >
          {primaryAction.label}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
