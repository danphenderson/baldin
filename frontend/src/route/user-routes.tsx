import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { UserContext } from '../context/user-context';

const PrivateRoute: React.FC = () => {
  const { token } = useContext(UserContext); // Destructure to get token

  return (token ? <Outlet /> : <Navigate to="/login" />);
};

export default PrivateRoute;
