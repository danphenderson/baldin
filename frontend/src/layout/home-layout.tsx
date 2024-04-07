import React from 'react';
import { Outlet } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import Header from '../component/common/header';
import Footer from '../component/common/footer';
import { Box, Stack } from '@mui/material';

const HomeLayout: React.FC = () => {
  return (
    <Stack>
      <Header />
        <Paper component="main" elevation={16} sx={{borderRadius: 0 }}>
          <Box sx={{ p: 8 }}>
          <Outlet/> {/* This will render the current route's page */}
          </Box>
        </Paper>
      <Footer />
    </Stack>
  );
};

export default HomeLayout;
