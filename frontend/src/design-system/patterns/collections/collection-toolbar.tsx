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
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: { md: 'center' },
        columnGap: 2,
        rowGap: 1.5,
      }}
    >
      {search && (
        <Box
          sx={{
            minWidth: 0,
            flex: { xs: '1 1 100%', md: '1 1 320px' },
            display: 'flex',
            '& > *': {
              flex: 1,
              minWidth: 0,
              maxWidth: '100%',
            },
          }}
        >
          {search}
        </Box>
      )}

      {controls && (
        <Box
          sx={{
            minWidth: 0,
            flex: { xs: '1 1 100%', md: '1 1 auto' },
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1.5,
            '& > *': {
              maxWidth: '100%',
            },
          }}
        >
          {controls}
        </Box>
      )}

      {actions && (
        <Box
          sx={{
            minWidth: 0,
            flex: { xs: '1 1 100%', md: '0 1 auto' },
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1.5,
            justifyContent: { xs: 'flex-start', md: 'flex-end' },
            ml: { md: 'auto' },
            '& > *': {
              maxWidth: '100%',
            },
          }}
        >
          {actions}
        </Box>
      )}
    </Box>

    {secondary && <Box>{secondary}</Box>}
  </Stack>
);

export default CollectionToolbar;
