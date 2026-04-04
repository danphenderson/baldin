import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import UserRoute from './user-routes';
import AuthLayout from '../layout/auth-layout';
import AppLayout from '../layout/app-layout';
import HomeLayout from '../layout/home-layout';
import DashboardPage from '../page/dashboard';
import LeadsPage from '../page/leads';
import ApplicationsPage from '../page/applications';
import DocumentsPage from '../page/documents';
import ProfilePage from '../page/profile';
import PipelinesPage from '../page/pipelines';
import CompaniesPage from '../page/companies';
import LoginPage from '../page/login';
import RegisterPage from '../page/register';
import UserTermsPage from '../page/user-terms';
import ErrorPage from '../page/error';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<UserRoute />}>
          <Route index element={<DashboardPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/workflows" element={<PipelinesPage />} />
          <Route path="/pipelines" element={<Navigate to="/workflows" replace />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="*" element={<ErrorPage />} />
        </Route>
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<HomeLayout />}>
        <Route path="/user-terms" element={<UserTermsPage />} />
      </Route>

      <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
};

export default AppRoutes;
