import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/source-sans-3/700.css';
import '@fontsource/source-sans-3/800.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';

import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import ThemeProvider from '../theme/theme-provider';
import { devBootstrapSuperuserSession } from '../service/auth';
import { clearStoredAuthToken } from '../util/auth-storage';

const DEFAULT_NEXT_PATH = '/admin/db-management';

const resolveNextPath = (search: string): string => {
  const params = new URLSearchParams(search);
  const requestedNext = params.get('next');

  if (!requestedNext) {
    return DEFAULT_NEXT_PATH;
  }

  try {
    const resolved = new URL(requestedNext, window.location.origin);
    if (resolved.origin !== window.location.origin) {
      return DEFAULT_NEXT_PATH;
    }

    const nextPath = `${resolved.pathname}${resolved.search}${resolved.hash}`;
    return nextPath.startsWith('/admin/') ? nextPath : DEFAULT_NEXT_PATH;
  } catch {
    return DEFAULT_NEXT_PATH;
  }
};

const AdminSessionBootstrapPage: React.FC = () => {
  const nextPath = useMemo(() => resolveNextPath(window.location.search), []);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      document.title = 'Baldin Admin Session Bootstrap';
      clearStoredAuthToken();
      setErrorMessage(null);

      try {
        const token = await devBootstrapSuperuserSession();
        if (cancelled) {
          return;
        }

        window.localStorage.setItem('baldin_token', token);
        window.location.replace(nextPath);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'DEV superuser bootstrap failed.',
        );
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [attempt, nextPath]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', bgcolor: 'background.default', py: 6 }}>
      <Container maxWidth="sm">
        <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="overline" sx={{ letterSpacing: '0.14em' }}>
                Baldin Admin Capture
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                Attach superuser session
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Bootstrapping a local DEV admin session before redirecting to the requested admin route.
              </Typography>
            </Box>

            {errorMessage ? (
              <>
                <Alert severity="error">{errorMessage}</Alert>
                <Typography color="text.secondary">
                  The local bootstrap endpoint must be available in DEV or PYTEST and the configured
                  bootstrap admin must exist as an active superuser.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Redirect target: {nextPath}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                  <Button variant="contained" onClick={() => setAttempt((value) => value + 1)}>
                    Retry bootstrap
                  </Button>
                  <Button href="/admin/login" variant="outlined">
                    Open admin login
                  </Button>
                </Stack>
              </>
            ) : (
              <>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <CircularProgress size={24} />
                  <Typography>Signing in with the configured local superuser and redirecting…</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Redirect target: {nextPath}
                </Typography>
              </>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Admin session bootstrap root element was not found.');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <AdminSessionBootstrapPage />
    </ThemeProvider>
  </React.StrictMode>,
);
