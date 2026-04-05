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
import NetworkGroupLayout from '../layout/network-group-layout';
import SettingsGroupLayout from '../layout/settings-group-layout';
import DashboardPage from '../page/dashboard';
import LeadsPage from '../page/leads';
import { ApplicationsQueuePage, ApplicationsBoardPage, ApplicationDetailPage } from '../page/applications';
import { DocumentListPage, DocumentDetailPage, DocumentEditorPage, DocumentComparePage } from '../page/documents';
import ProfilePage from '../page/profile/index';
import PipelinesPage from '../page/pipelines';
import CompaniesPage from '../page/companies';
import ExtractorPage from '../page/extractor';
import DirectoryPage from '../page/directory';
import UserProfilePage from '../page/user-profile';
import ConnectionsPage from '../page/connections';
import ConversationsPage from '../page/messages/conversations-page';
import ConversationDetailPage from '../page/messages/conversation-detail-page';
import SubscriptionPage from '../page/settings/subscription-page';
import GraduationPage from '../page/settings/graduation-page';
import CrawlersPage from '../page/crawlers';
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
            <Route path="documents" element={<DocumentListPage />} />
            <Route path="documents/new" element={<DocumentEditorPage />} />
            <Route path="documents/:id" element={<DocumentDetailPage />} />
            <Route path="documents/:id/edit" element={<DocumentEditorPage />} />
            <Route path="documents/:id/compare" element={<DocumentComparePage />} />
          </Route>

          {/* ── Workflows group ── */}
          <Route path="workflows" element={<WorkflowsGroupLayout />}>
            <Route index element={<PipelinesPage />} />
            <Route path="extractors" element={<ExtractorPage />} />
            <Route path="crawlers" element={<CrawlersPage />} />
          </Route>

          {/* ── Network group ── */}
          <Route path="network" element={<NetworkGroupLayout />}>
            <Route path="directory" element={<DirectoryPage />} />
            <Route path="directory/:userId" element={<UserProfilePage />} />
            <Route path="connections" element={<ConnectionsPage />} />
            <Route path="messages" element={<ConversationsPage />} />
            <Route path="messages/:conversationId" element={<ConversationDetailPage />} />
          </Route>

          {/* ── Settings group ── */}
          <Route path="settings" element={<SettingsGroupLayout />}>
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="graduation" element={<GraduationPage />} />
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
