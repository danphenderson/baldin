import React from 'react';
import { Outlet } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import Drawer from '@mui/material/Drawer';
import Header from '../component/common/header';
import Footer from '../component/common/footer';
import Navigator from '../component/common/navigator';

const drawerWidth = 240;

const HomeLayout: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header />
      <div style={{ display: 'flex', flexGrow: 1, height: 'calc(100vh - 64px)' }}> {/* Adjust height based on Header and Footer */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              height: '100%',
            },
          }}
        >
          <Navigator />
        </Drawer>
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
