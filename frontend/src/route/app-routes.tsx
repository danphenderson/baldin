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
import AutomationGroupLayout from '../layout/automation-group-layout';
import NetworkGroupLayout from '../layout/network-group-layout';
import SettingsGroupLayout from '../layout/settings-group-layout';
import { legacyRedirects, legacyPrefixRedirects } from './navigation';
import {
  ADMIN_APP_ROOT_PATH,
  ADMIN_CRAWLERS_PATH,
  ADMIN_DB_MANAGEMENT_PATH,
  ADMIN_REVIEW_PATH,
} from '../admin/paths';
import { navigateInBrowser } from '../util/browser-navigation';

/* ── Lazy page imports ─────────────────────────────────────────────── */

const DashboardPage = React.lazy(() => import('../page/dashboard'));
const LeadsPage = React.lazy(() => import('../page/leads'));
const ApplicationsQueuePage = React.lazy(() => import('../page/applications/applications-queue-page'));
const ApplicationsBoardPage = React.lazy(() => import('../page/applications/applications-board-page'));
const ApplicationDetailPage = React.lazy(() => import('../page/applications/applications-detail-page'));
const WorkspaceListPage = React.lazy(() => import('../page/documents/document-list'));
const WorkspaceDetailPage = React.lazy(() => import('../page/documents/document-detail'));
const WorkspaceEditorPage = React.lazy(() => import('../page/documents/document-editor'));
const WorkspaceComparePage = React.lazy(() => import('../page/documents/document-compare'));
const ProfilePage = React.lazy(() => import('../page/profile/index'));
const PipelinesPage = React.lazy(() => import('../page/pipelines'));
const CompaniesPage = React.lazy(() => import('../page/companies'));
const ExtractorPage = React.lazy(() => import('../page/extractor'));
const DiscoverPage = React.lazy(() => import('../page/directory'));
const UserProfilePage = React.lazy(() => import('../page/user-profile'));
const ConnectionsPage = React.lazy(() => import('../page/connections'));
const AgentsPage = React.lazy(() => import('../page/agents'));
const AgentDetailPage = React.lazy(() => import('../page/agent-detail'));
const AgentChatShellPage = React.lazy(() => import('../page/agent-chat-shell'));
const ConversationsPage = React.lazy(() => import('../page/messages/conversations-page'));
const ConversationDetailPage = React.lazy(() => import('../page/messages/conversation-detail-page'));
const AccountPage = React.lazy(() => import('../page/settings/account-page'));
const SubscriptionPage = React.lazy(() => import('../page/settings/subscription-page'));
const DiscoverabilityPage = React.lazy(() => import('../page/settings/discoverability-page'));
const GraduationPage = React.lazy(() => import('../page/settings/graduation-page'));
const AspirationRolesPage = React.lazy(() => import('../page/aspirations/roles-page'));
const AspirationCompaniesPage = React.lazy(() => import('../page/aspirations/companies-page'));
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

/** Redirects legacy path prefixes to their new canonical route families. */
const LegacyPrefixRedirect: React.FC<{ toPrefix: string }> = ({ toPrefix }) => {
  const params = useParams();
  const location = useLocation();
  const rest = params['*'] ?? '';
  const suffix = rest ? `/${rest}` : '';
  return <Navigate to={`${toPrefix}${suffix}${location.search}`} replace />;
};

const BrowserRedirect: React.FC<{ to: string }> = ({ to }) => {
  React.useEffect(() => {
    navigateInBrowser(to, { replace: true });
  }, [to]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress aria-label="Redirecting to the admin console" />
    </Box>
  );
};

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="workflows/db-management" element={<BrowserRedirect to={ADMIN_DB_MANAGEMENT_PATH} />} />
        <Route path="workflows/review" element={<BrowserRedirect to={ADMIN_REVIEW_PATH} />} />
        <Route path="workflows/crawlers" element={<BrowserRedirect to={ADMIN_CRAWLERS_PATH} />} />
        <Route path="workflows/admin" element={<BrowserRedirect to={ADMIN_APP_ROOT_PATH} />} />
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
            <Route path="aspirations/roles" element={<AspirationRolesPage />} />
            <Route path="aspirations/companies" element={<AspirationCompaniesPage />} />
          </Route>

          {/* ── Workspace group ── */}
          <Route path="workspace" element={<DocumentsGroupLayout />}>
            <Route index element={<WorkspaceListPage />} />
            <Route path="new" element={<WorkspaceEditorPage />} />
            <Route path=":id" element={<WorkspaceDetailPage />} />
            <Route path=":id/edit" element={<WorkspaceEditorPage />} />
            <Route path=":id/compare" element={<WorkspaceComparePage />} />
          </Route>

          {/* ── Workflows group ── */}
          <Route path="workflows" element={<WorkflowsGroupLayout />}>
            <Route index element={<PipelinesPage />} />
            <Route path="extractors" element={<ExtractorPage />} />
          </Route>

          {/* ── Automation group ── */}
          <Route path="automation" element={<AutomationGroupLayout />}>
            <Route index element={<Navigate to="/automation/agents" replace />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="agents/:agentId" element={<AgentDetailPage />} />
            <Route path="agents/:agentId/chat/:sessionId" element={<AgentChatShellPage />} />
          </Route>

          {/* ── Network group ── */}
          <Route path="network" element={<NetworkGroupLayout />}>
            <Route index element={<Navigate to="/network/discover" replace />} />
            <Route path="discover" element={<DiscoverPage />} />
            <Route path="discover/:userId" element={<UserProfilePage />} />
            <Route path="connections" element={<ConnectionsPage />} />
            <Route path="messages" element={<ConversationsPage />} />
            <Route path="messages/:conversationId" element={<ConversationDetailPage />} />
          </Route>

          {/* ── Settings group ── */}
          <Route path="settings" element={<SettingsGroupLayout />}>
            <Route index element={<AccountPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="discoverability" element={<DiscoverabilityPage />} />
            <Route path="graduation" element={<GraduationPage />} />
          </Route>

          {/* ── Legacy redirects ── */}
          {Object.entries(legacyRedirects).map(([legacyPath, targetPath]) => (
            <Route
              key={legacyPath}
              path={legacyPath.replace(/^\//, '')}
              element={<Navigate to={targetPath} replace />}
            />
          ))}
          {legacyPrefixRedirects.map(({ fromPrefix, toPrefix }) => (
            <Route
              key={`${fromPrefix}-prefix`}
              path={`${fromPrefix.replace(/^\//, '')}/*`}
              element={<LegacyPrefixRedirect toPrefix={toPrefix} />}
            />
          ))}

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
