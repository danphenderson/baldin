import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, useTheme, alpha } from '@mui/material';
import { Home as HomeIcon, ErrorOutline as ErrorIcon } from '@mui/icons-material';

export default function ErrorPage() {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <ErrorIcon sx={{ fontSize: 80, color: alpha(theme.palette.error.main, 0.5), mb: 2 }} />
      <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>404</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>Page not found</Typography>
      <Button variant="contained" startIcon={<HomeIcon />} onClick={() => navigate('/')}>
        Back to Dashboard
      </Button>
    </Box>
  );
}
