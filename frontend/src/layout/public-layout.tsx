// src/layout/PublicLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Paper from '@mui/material/Paper';

const PublicLayout: React.FC = () => {
  return (
    <Paper elevation={10} sx={{ p: 2, margin: 'auto'}}>
      <Outlet /> {/* This will render the current route's component */}
    </Paper>
  );
};

export default PublicLayout;
