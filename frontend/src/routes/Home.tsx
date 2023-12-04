import React from 'react';
import { Typography, Box } from '@mui/material';

const Home: React.FC = () => {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }} >
        <Typography variant='h4'>Home Page</Typography>
      </Box>
    </>
  );
}

export default Home;
