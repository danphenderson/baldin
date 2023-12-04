// src/layout/MainLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import Header from '../component/common/header';
import Footer from '../component/common/footer';

const HomeLayout: React.FC = () => {
  return (
    <>
      <Header/>
      <Paper elevation={10} sx={{ p: 2, margin: 'auto', flexGrow: 1 }}>
        <Outlet /> {/* This will render the current route's component */}
      </Paper>
      <Footer title="Footer Content" />
    </>
  );
};

export default HomeLayout;
