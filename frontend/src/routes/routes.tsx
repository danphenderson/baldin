import React from 'react';
import { Routes, Route } from 'react-router-dom';
import UserRoute from './user-route';
import App from '../pages/home';
import Login from '../pages/login';
import PublicLayout from '../layout/public-layout';
import AppLayout from '../layout/home-layout';
import Register from '../pages/register';
import ErrorPage from '../pages/error-page';
import Settings from '../pages/settings';
import Leads from '../pages/leads';
// import Applications from '../pages/applications';
import ETL from '../pages/etl';

const AppRoutes: React.FC = () => {
  return (
    <Routes>

        <Route element={<AppLayout />}>
            <Route path="/" element={<UserRoute />}>
                <Route index element={<App />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/leads" element={<Leads />} />
                {/* <Route path="/applications" element={<Applications />} /> */}
                <Route path="/etl" element={<ETL />} />
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
