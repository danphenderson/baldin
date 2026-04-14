import React from 'react';
import { Box } from '@mui/material';

export const noop = () => {};

export const StorybookSurface: React.FC<{
  children: React.ReactNode;
  maxWidth?: number | string;
}> = ({ children, maxWidth = 960 }) => (
  <Box sx={{ width: '100%', maxWidth, mx: 'auto' }}>
    {children}
  </Box>
);

export const StorybookCenteredSurface: React.FC<{
  children: React.ReactNode;
  maxWidth?: number | string;
}> = ({ children, maxWidth = 720 }) => (
  <Box
    sx={{
      width: '100%',
      maxWidth,
      minHeight: '70vh',
      mx: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </Box>
);
