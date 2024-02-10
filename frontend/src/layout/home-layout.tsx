import React from 'react';
import { Outlet } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import Header from '../component/common/header';
import Footer from '../component/common/footer';
import { Stack } from '@mui/material';

const HomeLayout: React.FC = () => {
  return (
    <Stack>
      <Header />
      <Paper component="main" elevation={10} sx={{borderRadius: 0 }}>
        <Outlet/> {/* This will render the current route's page */}
      </Paper>
      <Footer />
    </Stack>
  );
};

export default HomeLayout;
