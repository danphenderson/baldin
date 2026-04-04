import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useTheme, alpha } from '@mui/material';

const AuthLayout: React.FC = () => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.palette.mode === 'dark'
          ? `radial-gradient(ellipse at 20% 50%, ${alpha(theme.palette.primary.dark, 0.15)} 0%, transparent 50%),
             radial-gradient(ellipse at 80% 20%, ${alpha(theme.palette.secondary.dark, 0.1)} 0%, transparent 50%),
             ${theme.palette.background.default}`
          : theme.palette.background.default,
      }}
    >
      <Outlet />
    </Box>
  );
};

export default AuthLayout;
