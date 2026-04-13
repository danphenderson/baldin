import React from 'react';
import { Box, Stack, type SxProps, type Theme } from '@mui/material';
import { toSpacingPx } from '../../tokens/spacing';

export interface CollectionToolbarProps {
  search?: React.ReactNode;
  controls?: React.ReactNode;
  actions?: React.ReactNode;
  secondary?: React.ReactNode;
  sx?: SxProps<Theme>;
}

export const CollectionToolbar: React.FC<CollectionToolbarProps> = ({
  search,
  controls,
  actions,
  secondary,
  sx,
}) => (
  <Stack
    spacing={secondary ? 1.5 : 0}
    sx={[
      {
        px: { xs: 0, md: toSpacingPx(0.5) },
        py: toSpacingPx(0.5),
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  >
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      alignItems={{ md: 'center' }}
    >
      {search && (
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {search}
        </Box>
      )}

      {controls && (
        <Stack
          direction="row"
          spacing={1.5}
          useFlexGap
          sx={{ flexWrap: 'wrap' }}
        >
          {controls}
        </Stack>
      )}

      {actions && (
        <Stack
          direction="row"
          spacing={1.5}
          useFlexGap
          sx={{ flexWrap: 'wrap', justifyContent: { md: 'flex-end' } }}
        >
          {actions}
        </Stack>
      )}
    </Stack>

    {secondary && <Box>{secondary}</Box>}
  </Stack>
);

export default CollectionToolbar;
