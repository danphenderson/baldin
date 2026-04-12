import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useTheme } from '@mui/material';
import { authBackgroundGradient } from '../theme/effects';

const AuthLayout: React.FC = () => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: authBackgroundGradient(theme),
      }}
    >
      <Box sx={{ maxWidth: 480, mx: 'auto', width: '100%' }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default AuthLayout;
