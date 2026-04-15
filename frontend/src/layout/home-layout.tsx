import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Footer from '../component/common/footer';

const HomeLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === '/') {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Outlet />
      </Box>
    );
  }

  return (
    <Stack sx={{ minHeight: '100vh' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <ButtonBase
            onClick={() => navigate('/')}
            aria-label="Go to Baldin home"
            sx={{
              flexGrow: 1,
              justifyContent: 'flex-start',
              textAlign: 'left',
              borderRadius: '8px',
            }}
          >
            <Typography
              variant="h6"
              component="span"
              sx={{ fontWeight: 700 }}
            >
              Baldin
            </Typography>
          </ButtonBase>
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
