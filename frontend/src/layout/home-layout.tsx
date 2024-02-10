import React from 'react';
import { Outlet } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import Header from '../component/common/header';
import Footer from '../component/common/footer';

const HomeLayout: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header />
      <div style={{ display: 'flex', flexGrow: 1, height: 'calc(100vh - 64px)' }}> {/* Adjust height based on Header and Footer */}
        <main style={{ flexGrow: 1, overflow: 'auto' }}>
          <Paper elevation={10} style={{ height: '100%', margin: 0, borderRadius: 0 }}>
            <Outlet /> {/* This will render the current route's component */}
          </Paper>
        </main>
      </div>
      <Footer title="Footer Content" />
    </div>
  );
};

export default HomeLayout;
