import React from 'react';
import { Routes, Route } from 'react-router-dom';
import UserRoute from './user-routes';
import App from '../page/home';
import LoginPage from '../page/login';
import PublicLayout from '../layout/public-layout';
import AppLayout from '../layout/home-layout';
import RegistrationPage from '../page/register';
import ErrorPage from '../page/error';
import UserProfilePage from '../page/profile';
import LeadsPage from '../page/leads';
import DataOrchestrationPage from '../page/data-orchestration';
import ApplicationsPage from '../page/applications';
import UserTermsPage from '../page/user-terms';
import ExtractorPage from '../page/extractors';

const AppRoutes: React.FC = () => {
  return (
    <Routes>

        <Route element={<AppLayout />}>
            <Route path="/" element={<UserRoute />}>
                <Route index element={<App />} />
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/applications" element={<ApplicationsPage />} />
                <Route path="/data-orchestration" element={<DataOrchestrationPage />} />
                <Route path="/profile" element={<UserProfilePage />} />
                <Route path="/extractors" element={<ExtractorPage />} />
                <Route path="*" element={<ErrorPage />} />
                {/* More user routes can be added here */}
            </Route>
        </Route>

        <Route element={<PublicLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/user-terms" element={<UserTermsPage/>} />
            {/* Other public routes */}
        </Route>

        <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
};

export default AppRoutes;
