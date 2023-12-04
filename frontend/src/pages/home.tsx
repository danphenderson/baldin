import React from 'react';
import { Typography } from '@mui/material';
import Header from '../component/common/header';
import Footer from '../component/common/footer';

const Home: React.FC = () => {
  return (
    <>
      <Header title="Header Title"/>
      <Typography variant='h4'>Home Page</Typography>
      <Footer title="TODO: Include a Site Map here"/>
    </>
  );
}

export default Home;
