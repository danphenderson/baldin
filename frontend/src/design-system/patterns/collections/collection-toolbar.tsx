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
    data-collection-toolbar-slot="root"
    sx={[
      {
        px: { xs: 0, md: toSpacingPx(0.5) },
        py: toSpacingPx(0.5),
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  >
    <Box
      data-collection-toolbar-slot="primary"
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          md: search && (controls || actions) ? 'minmax(0, 1fr) auto' : 'minmax(0, 1fr)',
        },
        alignItems: { md: 'center' },
        columnGap: 2,
        rowGap: 1.5,
      }}
    >
      {search && (
        <Box
          data-collection-toolbar-slot="search"
          sx={{
            minWidth: 0,
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

      {(controls || actions) && (
        <Box
          data-collection-toolbar-slot="controls-group"
          sx={{
            minWidth: 0,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: { xs: 'flex-start', md: 'flex-end' },
            rowGap: 1.5,
            columnGap: 1.5,
            width: { xs: '100%', md: 'auto' },
          }}
        >
          {controls && (
            <Box
              data-collection-toolbar-slot="controls"
              sx={{
                minWidth: 0,
                flex: { xs: '1 1 100%', sm: '1 1 auto' },
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                rowGap: 1.5,
                columnGap: 1.5,
                '& > *': {
                  minWidth: 0,
                  maxWidth: '100%',
                },
              }}
            >
              {controls}
            </Box>
          )}

          {actions && (
            <Box
              data-collection-toolbar-slot="actions"
              sx={{
                minWidth: 0,
                flex: { xs: '1 1 100%', sm: '0 1 auto' },
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                rowGap: 1.5,
                columnGap: 1.5,
                ml: { sm: controls ? 'auto' : 0 },
                '& > *': {
                  minWidth: 0,
                  maxWidth: '100%',
                },
              }}
            >
              {actions}
            </Box>
          )}
        </Box>
      )}
    </Box>

    {secondary && <Box data-collection-toolbar-slot="secondary">{secondary}</Box>}
  </Stack>
);

export default CollectionToolbar;
