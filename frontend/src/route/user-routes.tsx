import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { UserContext } from '../context/user-context';

const PrivateRoute: React.FC = () => {
  const { token, loading } = useContext(UserContext);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }} role="status" aria-label="Checking authentication">
        <CircularProgress />
      </Box>
    );
  }

  return (token ? <Outlet /> : <Navigate to="/login" />);
};

export default PrivateRoute;
