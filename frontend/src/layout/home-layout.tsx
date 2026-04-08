import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Footer from '../component/common/footer';

const HomeLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Stack sx={{ minHeight: '100vh' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography
            variant="h6"
            component="span"
            sx={{ flexGrow: 1, fontWeight: 700, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            Baldin
          </Typography>
          <Button color="inherit" onClick={() => navigate('/login')}>
            Sign in
          </Button>
        </Toolbar>
      </AppBar>

      <Paper component="main" elevation={0} sx={{ borderRadius: 0, flex: 1 }}>
        <Box sx={{ p: { xs: 3, sm: 6, md: 8 } }}>
          <Outlet />
        </Box>
      </Paper>

      <Footer />
    </Stack>
  );
};

export default HomeLayout;
