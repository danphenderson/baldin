import React from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { radiusTokens, toRadiusPx } from '../../tokens/radius';
import { spacingTokens, toSpacingPx } from '../../tokens/spacing';
import { StatusChip } from '../status/status-chip';

export interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  count?: React.ReactNode;
  supportingText?: React.ReactNode;
  action?: React.ReactNode;
  divider?: boolean;
  size?: 'default' | 'compact';
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  count,
  supportingText,
  action,
  divider = false,
  size = 'default',
}) => {
  const theme = useTheme();
  const baldin = (theme as typeof theme & { baldin?: typeof theme.baldin }).baldin;
  const cornerRadius = baldin?.radius.md ?? radiusTokens.md;
  const compact = size === 'compact';
  const iconSize = compact ? 36 : 40;
  const bottomSpacing = compact ? spacingTokens.controlGap + 2 : spacingTokens.controlGap + 3;
  const selectedState = baldin?.state.selected ?? alpha(theme.palette.primary.main, 0.08);
  const accentBorder = baldin?.border.accent ?? alpha(theme.palette.primary.main, 0.16);
  const subtleBorder = baldin?.border.subtle ?? theme.palette.divider;

  return (
    <Box sx={{ mb: toSpacingPx(bottomSpacing) }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: supportingText ? 'flex-start' : 'center',
          gap: toSpacingPx(compact ? 1.5 : 2),
        }}
      >
        {icon && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: iconSize,
              height: iconSize,
              borderRadius: toRadiusPx(cornerRadius),
              color: theme.palette.primary.main,
              backgroundColor: selectedState,
              border: `1px solid ${accentBorder}`,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        )}

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography
              variant={compact ? 'body1' : 'h6'}
              color="text.primary"
              fontWeight={700}
              sx={{ minWidth: 0 }}
            >
              {title}
            </Typography>
            {typeof count !== 'undefined' && (
              <StatusChip
                label={count}
                tone="primary"
                emphasis="soft"
                size="small"
              />
            )}
          </Box>
          {supportingText && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: toSpacingPx(0.5) }}
            >
              {supportingText}
            </Typography>
          )}
        </Box>

        {action && (
          <Box sx={{ flexShrink: 0 }}>
            {action}
          </Box>
        )}
      </Box>

      {divider && (
        <Divider sx={{ mt: toSpacingPx(compact ? 3 : 4), borderColor: subtleBorder }} />
      )}
    </Box>
  );
};

export default SectionHeader;
