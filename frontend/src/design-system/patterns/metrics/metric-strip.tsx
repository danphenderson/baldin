import React from 'react';
import { Box, ButtonBase, Divider, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { CardShell } from '../../primitives/surfaces/card-shell';
import { radiusTokens, toRadiusPx } from '../../tokens/radius';

export interface MetricStripItem {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export interface MetricStripProps {
  items: MetricStripItem[];
  variant: 'inline' | 'card';
  align?: 'center' | 'start';
  dividers?: boolean;
}

const MetricStripContent: React.FC<{
  items: MetricStripItem[];
  focusRing: string;
  align: 'center' | 'start';
  dividers: boolean;
}> = ({
  items,
  focusRing,
  align,
  dividers,
}) => (
  <Stack
    direction="row"
    divider={dividers ? <Divider orientation="vertical" flexItem /> : undefined}
    spacing={3}
    sx={{
      justifyContent: align === 'start' ? 'flex-start' : 'space-around',
      flexWrap: { xs: 'wrap', sm: 'nowrap' },
      rowGap: 1,
    }}
  >
    {items.map((item) => {
      const content = (
        <>
          {item.icon && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                mb: 0.25,
                color: item.color ?? 'text.secondary',
              }}
            >
              {item.icon}
            </Box>
          )}
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: item.color ?? 'text.primary', lineHeight: 1.2 }}>
            {item.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {item.label}
          </Typography>
        </>
      );

      if (item.onClick) {
        return (
          <ButtonBase
            key={item.label}
            onClick={item.onClick}
            focusRipple
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: align === 'start' ? 'flex-start' : 'center',
              textAlign: align === 'start' ? 'left' : 'center',
              minWidth: align === 'start' ? 0 : 64,
              flexShrink: 0,
              borderRadius: toRadiusPx(radiusTokens.xs),
              px: 1,
              py: 0.5,
              transition: 'background-color 180ms ease, box-shadow 180ms ease',
              '&:hover': { backgroundColor: 'action.hover' },
              '&.Mui-focusVisible': {
                boxShadow: `0 0 0 4px ${focusRing}`,
              },
            }}
          >
            {content}
          </ButtonBase>
        );
      }

      return (
        <Box
          key={item.label}
          sx={{
            textAlign: align === 'start' ? 'left' : 'center',
            minWidth: align === 'start' ? 0 : 64,
            flexShrink: 0,
          }}
        >
          {content}
        </Box>
      );
    })}
  </Stack>
);

export const MetricStrip: React.FC<MetricStripProps> = ({
  items,
  variant,
  align = 'center',
  dividers = true,
}) => {
  const theme = useTheme();
  const baldin = (theme as typeof theme & { baldin?: typeof theme.baldin }).baldin;
  const stripRadius = baldin?.radius.lg ?? radiusTokens.lg;
  const focusRing = baldin?.state.focusRing ?? theme.palette.action.focus;
  const insetSurface = baldin?.surface.inset ?? theme.palette.action.hover;
  const defaultBorder = baldin?.border.default ?? theme.palette.divider;

  if (variant === 'card') {
    return (
      <CardShell density="compact" surface="raised" contentSx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <MetricStripContent
          items={items}
          focusRing={focusRing}
          align={align}
          dividers={dividers}
        />
      </CardShell>
    );
  }

  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: toRadiusPx(stripRadius),
        bgcolor: insetSurface,
        border: `1px solid ${defaultBorder}`,
        overflowX: 'auto',
      }}
    >
      <MetricStripContent
        items={items}
        focusRing={focusRing}
        align={align}
        dividers={dividers}
      />
    </Box>
  );
};

export default MetricStrip;
