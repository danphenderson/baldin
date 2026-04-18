import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Link, Stack, Typography } from '@mui/material';
import { LockOutlined as LockIcon } from '@mui/icons-material';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { UserContext } from '../context/user-context';
import LoginPage from '../page/login';
import DbManagementPage from '../page/db-management';
import ReviewQueuePage from '../page/review-queue';
import CrawlersPage from '../page/crawlers';
import AdminLayout from './admin-layout';
import {
  ADMIN_CRAWLERS_ROUTE,
  ADMIN_DB_MANAGEMENT_ROUTE,
  ADMIN_HOME_ROUTE,
  ADMIN_LOGIN_PATH,
  ADMIN_LOGIN_ROUTE,
  ADMIN_REVIEW_ROUTE,
} from './paths';
import { clearStoredAuthToken } from '../util/auth-storage';

const AdminLoadingState: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'background.default',
    }}
  >
    <CircularProgress />
  </Box>
);

const AdminAccessDeniedState: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      px: 2,
      backgroundColor: 'background.default',
    }}
  >
    <Stack spacing={2.5} sx={{ maxWidth: 460 }}>
      <Typography variant="h4" fontWeight={700}>
        Admin access denied
      </Typography>
      <Alert severity="error">
        This account is not a superuser. The admin session has been cleared.
      </Alert>
      <Typography color="text.secondary">
        Sign in again with a superuser account to continue, or sign in to the main product app.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
        <Button href={ADMIN_LOGIN_PATH} variant="contained">
          Sign in again
        </Button>
        <Button href="/login" variant="outlined">
          Sign in to product app
        </Button>
      </Stack>
    </Stack>
  </Box>
);

const AdminLoginRoute: React.FC = () => {
  const { token } = useContext(UserContext);
  const productAppPath = token ? '/dashboard' : '/login';
  const productAppLabel = token ? 'Open the product app' : 'Sign in to the product app';

  const footer = useMemo(() => (
    <Typography color="text.secondary" sx={{ typography: 'body2' }}>
      Use a superuser account to access local admin workflows.{' '}
      <Link href={productAppPath} color="inherit">
        {productAppLabel}
      </Link>
    </Typography>
  ), [productAppLabel, productAppPath]);

  return (
    <LoginPage
      description="Sign in with a superuser account to manage local operational workflows."
      footer={footer}
      icon={<LockIcon />}
      postLoginPath={ADMIN_HOME_ROUTE}
      title="Admin Console"
    />
  );
};

const AdminGuard: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const location = useLocation();
  const { loading, setToken, setUser, token, user } = useContext(UserContext);
  const [clearedUnauthorizedSession, setClearedUnauthorizedSession] = useState(false);
  const isResolvingAuthenticatedUser = Boolean(token && !user);

  useEffect(() => {
    if (loading || !token || !user || user.is_superuser || clearedUnauthorizedSession) {
      return;
    }

    clearStoredAuthToken();
    setUser(null);
    setToken(null);
    setClearedUnauthorizedSession(true);
  }, [clearedUnauthorizedSession, loading, setToken, setUser, token, user]);

  if (loading || isResolvingAuthenticatedUser) {
    return <AdminLoadingState />;
  }

  if (clearedUnauthorizedSession || (token && user && !user.is_superuser)) {
    return <AdminAccessDeniedState />;
  }

  if (!token) {
    return <Navigate replace state={{ from: location.pathname }} to={ADMIN_LOGIN_ROUTE} />;
  }

  return children;
};

const AdminLoginGate: React.FC = () => {
  const { loading, token, user } = useContext(UserContext);
  const isResolvingAuthenticatedUser = Boolean(token && !user);

  if (loading || isResolvingAuthenticatedUser) {
    return <AdminLoadingState />;
  }

  if (token && user?.is_superuser) {
    return <Navigate replace to={ADMIN_DB_MANAGEMENT_ROUTE} />;
  }

  return <AdminLoginRoute />;
};

const AdminIndexRoute: React.FC = () => {
  const { loading, token, user } = useContext(UserContext);
  const isResolvingAuthenticatedUser = Boolean(token && !user);

  if (loading || isResolvingAuthenticatedUser) {
    return <AdminLoadingState />;
  }

  if (token && user?.is_superuser) {
    return <Navigate replace to={ADMIN_DB_MANAGEMENT_ROUTE} />;
  }

  return <Navigate replace to={ADMIN_LOGIN_ROUTE} />;
};

const AdminRoutes: React.FC = () => (
  <Routes>
    <Route element={<AdminLoginGate />} path={ADMIN_LOGIN_ROUTE} />
    <Route element={<AdminGuard><AdminLayout /></AdminGuard>}>
      <Route index element={<AdminIndexRoute />} />
      <Route element={<DbManagementPage />} path={ADMIN_DB_MANAGEMENT_ROUTE} />
      <Route element={<ReviewQueuePage />} path={ADMIN_REVIEW_ROUTE} />
      <Route element={<CrawlersPage />} path={ADMIN_CRAWLERS_ROUTE} />
    </Route>
    <Route element={<Navigate replace to={ADMIN_HOME_ROUTE} />} path="*" />
  </Routes>
);

export default AdminRoutes;
