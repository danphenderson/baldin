import React from 'react';
import { Box, ButtonBase, Divider, Stack, Typography } from '@mui/material';
import { CardShell } from '../../primitives/surfaces/card-shell';

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
}

const MetricStripContent: React.FC<{ items: MetricStripItem[] }> = ({ items }) => (
  <Stack
    direction="row"
    divider={<Divider orientation="vertical" flexItem />}
    spacing={3}
    sx={{ justifyContent: 'space-around', flexWrap: { xs: 'wrap', sm: 'nowrap' }, rowGap: 1 }}
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
              textAlign: 'center',
              minWidth: 64,
              flexShrink: 0,
              borderRadius: 1,
              px: 0.5,
              py: 0.25,
              '&:hover': { opacity: 0.8 },
            }}
          >
            {content}
          </ButtonBase>
        );
      }

      return (
        <Box key={item.label} sx={{ textAlign: 'center', minWidth: 64, flexShrink: 0 }}>
          {content}
        </Box>
      );
    })}
  </Stack>
);

export const MetricStrip: React.FC<MetricStripProps> = ({ items, variant }) => {
  if (variant === 'card') {
    return (
      <CardShell padding="dense" contentSx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <MetricStripContent items={items} />
      </CardShell>
    );
  }

  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: 2,
        bgcolor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(255,255,255,0.03)'
            : 'rgba(0,0,0,0.02)',
        border: (theme) => `1px solid ${theme.palette.divider}`,
        overflowX: 'auto',
      }}
    >
      <MetricStripContent items={items} />
    </Box>
  );
};

export default MetricStrip;
