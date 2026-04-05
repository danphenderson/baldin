import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import UserRoute from './user-routes';
import AuthLayout from '../layout/auth-layout';
import AppLayout from '../layout/app-layout';
import HomeLayout from '../layout/home-layout';
import LeadsGroupLayout from '../layout/leads-group-layout';
import IdentityGroupLayout from '../layout/identity-group-layout';
import ApplicationsGroupLayout from '../layout/applications-group-layout';
import WorkflowsGroupLayout from '../layout/workflows-group-layout';
import DashboardPage from '../page/dashboard';
import LeadsPage from '../page/leads';
import { ApplicationsQueuePage, ApplicationsBoardPage, ApplicationDetailPage } from '../page/applications';
import DocumentsPage from '../page/documents';
import ProfilePage from '../page/profile';
import PipelinesPage from '../page/pipelines';
import CompaniesPage from '../page/companies';
import ExtractorPage from '../page/extractor';
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

          {/* ── Leads group ── */}
          <Route path="leads" element={<LeadsGroupLayout />}>
            <Route index element={<LeadsPage />} />
            <Route path="companies" element={<CompaniesPage />} />
          </Route>

          {/* ── Applications group ── */}
          <Route path="applications" element={<ApplicationsGroupLayout />}>
            <Route index element={<ApplicationsQueuePage />} />
            <Route path="board" element={<ApplicationsBoardPage />} />
            <Route path=":applicationId" element={<ApplicationDetailPage />} />
          </Route>

          {/* ── Identity group ── */}
          <Route path="me" element={<IdentityGroupLayout />}>
            <Route index element={<ProfilePage />} />
            <Route path="documents" element={<DocumentsPage />} />
          </Route>

          {/* ── Workflows group ── */}
          <Route path="workflows" element={<WorkflowsGroupLayout />}>
            <Route index element={<PipelinesPage />} />
            <Route path="extractors" element={<ExtractorPage />} />
          </Route>

          {/* ── Legacy redirects ── */}
          <Route path="companies" element={<Navigate to="/leads/companies" replace />} />
          <Route path="documents" element={<Navigate to="/me/documents" replace />} />
          <Route path="profile" element={<Navigate to="/me" replace />} />
          <Route path="pipelines" element={<Navigate to="/workflows" replace />} />
          <Route path="data-orchestration" element={<Navigate to="/workflows" replace />} />
          <Route path="extractor" element={<Navigate to="/workflows/extractors" replace />} />

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
