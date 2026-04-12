import React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import { radiusTokens } from '../../tokens/radius';

export interface LoadingStateProps {
  kind: 'list' | 'grid' | 'section';
  count?: number;
  itemHeight?: number;
  columns?: { xs?: number; sm?: number; md?: number };
}

function toGridSize(columns: number | undefined): number {
  if (!columns || columns <= 1) {
    return 12;
  }

  return Math.max(1, Math.floor(12 / columns));
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  kind,
  count,
  itemHeight,
  columns,
}) => {
  const theme = useTheme();
  const radius = (theme as typeof theme & { baldin?: typeof theme.baldin }).baldin?.radius.lg ?? radiusTokens.lg;

  if (kind === 'list') {
    return (
      <Stack spacing={1.5}>
        {Array.from({ length: count ?? 4 }).map((_, index) => (
          <Skeleton
            key={index}
            variant="rounded"
            height={itemHeight ?? 88}
            sx={{ borderRadius: radius }}
          />
        ))}
      </Stack>
    );
  }

  if (kind === 'grid') {
    const gridColumns = columns ?? { xs: 1, sm: 2, md: 2 };

    return (
      <Grid container spacing={2}>
        {Array.from({ length: count ?? 6 }).map((_, index) => (
          <Grid
            key={index}
            size={{
              xs: toGridSize(gridColumns.xs),
              sm: toGridSize(gridColumns.sm),
              md: toGridSize(gridColumns.md),
            }}
          >
            <Skeleton
              variant="rounded"
              height={itemHeight ?? 180}
              sx={{ borderRadius: radius }}
            />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Stack spacing={2}>
      {Array.from({ length: count ?? 3 }).map((_, index) => (
        <Box key={index}>
          <Skeleton
            variant="rounded"
            height={itemHeight ?? 160}
            sx={{ borderRadius: radius }}
          />
        </Box>
      ))}
    </Stack>
  );
};

export default LoadingState;
