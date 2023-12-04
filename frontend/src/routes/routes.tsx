import React from 'react';
import { Routes, Route } from 'react-router-dom';
import UserRoute from './user-route';
import App from '../pages/home';
import Login from '../pages/login';
import PublicLayout from '../layout/public-layout';
import HomeLayout from '../layout/home-layout';
import Register from '../pages/register';
import ErrorPage from '../pages/error-page';
import Settings from '../pages/settings';

const AppRoutes: React.FC = () => {
  return (
    <Routes>

        <Route element={<HomeLayout />}>
            <Route path="/" element={<UserRoute />}>
                <Route index element={<App />} />
                <Route path="/settings" element={<Settings />} />
                {/* More user routes can be added here */}
            </Route>
        </Route>a\

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
