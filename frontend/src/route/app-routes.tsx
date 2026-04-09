import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import UserRoute from './user-routes';
import AuthLayout from '../layout/auth-layout';
import AppLayout from '../layout/app-layout';
import HomeLayout from '../layout/home-layout';
import LeadsGroupLayout from '../layout/leads-group-layout';
import IdentityGroupLayout from '../layout/identity-group-layout';
import ApplicationsGroupLayout from '../layout/applications-group-layout';
import DocumentsGroupLayout from '../layout/documents-group-layout';
import WorkflowsGroupLayout from '../layout/workflows-group-layout';
import NetworkGroupLayout from '../layout/network-group-layout';
import SettingsGroupLayout from '../layout/settings-group-layout';
import { UserContext } from '../context/user-context';

/* ── Lazy page imports ─────────────────────────────────────────────── */

const CommandCenterPage = React.lazy(() => import('../page/command-center'));
const LeadsPage = React.lazy(() => import('../page/leads'));
const ApplicationsQueuePage = React.lazy(() => import('../page/applications/applications-queue-page'));
const ApplicationsBoardPage = React.lazy(() => import('../page/applications/applications-board-page'));
const ApplicationDetailPage = React.lazy(() => import('../page/applications/applications-detail-page'));
const DocumentListPage = React.lazy(() => import('../page/documents/document-list'));
const DocumentDetailPage = React.lazy(() => import('../page/documents/document-detail'));
const DocumentEditorPage = React.lazy(() => import('../page/documents/document-editor'));
const DocumentComparePage = React.lazy(() => import('../page/documents/document-compare'));
const ProfilePage = React.lazy(() => import('../page/profile/index'));
const PipelinesPage = React.lazy(() => import('../page/pipelines'));
const CompaniesPage = React.lazy(() => import('../page/companies'));
const ExtractorPage = React.lazy(() => import('../page/extractor'));
const DirectoryPage = React.lazy(() => import('../page/directory'));
const UserProfilePage = React.lazy(() => import('../page/user-profile'));
const ConnectionsPage = React.lazy(() => import('../page/connections'));
const ConversationsPage = React.lazy(() => import('../page/messages/conversations-page'));
const ConversationDetailPage = React.lazy(() => import('../page/messages/conversation-detail-page'));
const AccountPage = React.lazy(() => import('../page/settings/account-page'));
const CrawlersPage = React.lazy(() => import('../page/crawlers'));
const ReviewQueuePage = React.lazy(() => import('../page/review-queue'));
const LoginPage = React.lazy(() => import('../page/login'));
const RegisterPage = React.lazy(() => import('../page/register'));
const UserTermsPage = React.lazy(() => import('../page/user-terms'));
const ErrorPage = React.lazy(() => import('../page/error'));

/* ── Suspense fallback ─────────────────────────────────────────────── */

const PageLoader: React.FC = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <CircularProgress />
  </Box>
);

/** Redirects non-superusers away from admin-only routes. */
const SuperuserRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = React.useContext(UserContext);
  if (!user?.is_superuser) return <Navigate to="/workflows" replace />;
  return children;
};

/** Redirects /me/documents/* paths to /documents/*. */
const MeDocumentsRedirect: React.FC = () => {
  const params = useParams();
  const location = useLocation();
  const rest = params['*'] ?? '';
  return <Navigate to={`/documents/${rest}${location.search}`} replace />;
};

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<UserRoute />}>
          <Route index element={<CommandCenterPage />} />

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
          </Route>

          {/* ── Documents group ── */}
          <Route path="documents" element={<DocumentsGroupLayout />}>
            <Route index element={<DocumentListPage />} />
            <Route path="new" element={<DocumentEditorPage />} />
            <Route path=":id" element={<DocumentDetailPage />} />
            <Route path=":id/edit" element={<DocumentEditorPage />} />
            <Route path=":id/compare" element={<DocumentComparePage />} />
          </Route>

          {/* ── Workflows group ── */}
          <Route path="workflows" element={<WorkflowsGroupLayout />}>
            <Route index element={<PipelinesPage />} />
            <Route path="extractors" element={<ExtractorPage />} />
            <Route path="review" element={<SuperuserRoute><ReviewQueuePage /></SuperuserRoute>} />
            <Route path="crawlers" element={<SuperuserRoute><CrawlersPage /></SuperuserRoute>} />
          </Route>

          {/* ── Network group ── */}
          <Route path="network" element={<NetworkGroupLayout />}>
            <Route index element={<Navigate to="/network/directory" replace />} />
            <Route path="directory" element={<DirectoryPage />} />
            <Route path="directory/:userId" element={<UserProfilePage />} />
            <Route path="connections" element={<ConnectionsPage />} />
            <Route path="messages" element={<ConversationsPage />} />
            <Route path="messages/:conversationId" element={<ConversationDetailPage />} />
          </Route>

          {/* ── Settings group ── */}
          <Route path="settings" element={<SettingsGroupLayout />}>
            <Route index element={<AccountPage />} />
          </Route>

          {/* ── Legacy redirects ── */}
          <Route path="companies" element={<Navigate to="/leads/companies" replace />} />
          <Route path="me/documents" element={<Navigate to="/documents" replace />} />
          <Route path="me/documents/*" element={<MeDocumentsRedirect />} />
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
    </Suspense>
  );
};

export default AppRoutes;
