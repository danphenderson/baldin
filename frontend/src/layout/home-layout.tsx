import React from 'react';
import { Outlet } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Header from '../component/common/header';
import Footer from '../component/common/footer';
import { Box, Stack } from '@mui/material';

const HomeLayout: React.FC = () => {
  return (
    <Stack>
      <Header />
      <Container component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Paper elevation={20} sx={{ minHeight: 'calc(100vh - 64px - 48px)', borderRadius: 0 }}> {/* Adjusted for header and footer height */}
          <Outlet /> {/* This will render the current route's component */}
        </Paper>
      </Container>
      <Footer title="Footer Content" />
    </Stack>
  );
};

export default HomeLayout;
