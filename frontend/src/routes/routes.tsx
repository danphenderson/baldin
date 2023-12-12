import React from 'react';
import { Routes, Route } from 'react-router-dom';
import UserRoute from './user-route';
import App from '../pages/home';
import LoginPage from '../pages/login';
import PublicLayout from '../layout/public-layout';
import AppLayout from '../layout/home-layout';
import RegistrationPage from '../pages/register';
import ErrorPage from '../pages/error';
import UserProfilePage from '../pages/user-profile';
import LeadsPage from '../pages/leads';
import ApplicationsPage from '../pages/applications';
import DataOrchestrationPage from '../pages/data-orchestration';

const AppRoutes: React.FC = () => {
  return (
    <Routes>

        <Route element={<AppLayout />}>
            <Route path="/" element={<UserRoute />}>
                <Route index element={<App />} />
                <Route path="/settings" element={<UserProfilePage />} />
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/applications" element={<ApplicationsPage />} />
                <Route path="/data-orchestration" element={<DataOrchestrationPage />} />
                {/* More user routes can be added here */}
            </Route>
        </Route>

        <Route element={<PublicLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            {/* Other public routes */}
        </Route>

        <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
};

export default AppRoutes;
