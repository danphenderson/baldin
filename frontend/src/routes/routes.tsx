import React from 'react';
import { Routes, Route } from 'react-router-dom';
import UserRoute from './user-route';
import Home from '../pages/home';
import Login from '../pages/login';
import PublicLayout from '../layout/public-layout';
import UserLayout from '../layout/user-layout';
import Register from '../pages/register';
import ErrorPage from '../pages/error-page';

const AppRoutes: React.FC = () => {
  return (
    <Routes>

        <Route element={<UserLayout />}>
            <Route path="/" element={<UserRoute />}>
                <Route index element={<Home />} />
                {/* More user routes can be added here */}
            </Route>
        </Route>

        <Route element={<PublicLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* Other public routes */}
        </Route>

        <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
};

export default AppRoutes;
