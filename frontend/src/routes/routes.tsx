import React from 'react';
import { Routes, Route } from 'react-router-dom';
import UserRoute from './restricted-route';
import Home from '../pages/home';
import Login from '../pages/login';
import Register from '../pages/register';
import ErrorPage from '../pages/error-page';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<UserRoute />}>
        <Route index element={<Home />} />
        {/* More private routes can be added here */}
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* Other public routes */}
      <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
};

export default AppRoutes;
