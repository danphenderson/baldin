import React, { useContext, useMemo, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  AdminPanelSettingsOutlined as AdminIcon,
  ArrowOutward as ExternalIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ToolbarHeaderContext, type ToolbarHeaderContent } from '../layout/toolbar-header-context';
import { UserContext } from '../context/user-context';
import { logout as logoutApi } from '../service/auth';
import { API_URL } from '../config/env';
import { ADMIN_LOGIN_ROUTE, ADMIN_NAV_ITEMS } from './paths';
import { clearStoredAuthToken } from '../util/auth-storage';

const DRAWER_WIDTH = 288;

const isActivePath = (pathname: string, targetPath: string): boolean => (
  pathname === targetPath || pathname.startsWith(`${targetPath}/`)
);

const AdminLayout: React.FC = () => {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user, setToken, setUser } = useContext(UserContext);
  const [toolbarHeader, setToolbarHeader] = useState<ToolbarHeaderContent | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const title = toolbarHeader?.title ?? 'Admin Console';
  const subtitle = toolbarHeader?.subtitle ?? 'Superuser operational surface';
  const displayName = user?.first_name?.trim() || user?.email || 'Superuser';
  const legacyAdminHref = useMemo(() => `${API_URL}/admin`, []);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      if (token) {
        await logoutApi(token);
      }
    } catch (error) {
      console.error('Failed to sign out from the backend session.', error);
    } finally {
      clearStoredAuthToken();
      setUser(null);
      setToken(null);
      setIsLoggingOut(false);
      navigate(ADMIN_LOGIN_ROUTE, { replace: true });
    }
  };

  const navigation = (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        flexDirection: 'column',
        background: alpha(theme.palette.background.paper, 0.94),
      }}
    >
      <Box sx={{ px: 2.5, py: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <AdminIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Baldin Admin
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {displayName}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Divider />

      <List sx={{ px: 1.5, py: 1.5 }}>
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = isActivePath(location.pathname, item.path);

          return (
            <ListItemButton
              key={item.path}
              selected={active}
              onClick={() => navigate(item.path)}
              sx={{
                mb: 0.75,
                alignItems: 'flex-start',
                borderRadius: 2,
                border: `1px solid ${active ? alpha(theme.palette.primary.main, 0.28) : 'transparent'}`,
                backgroundColor: active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
              }}
            >
              <ListItemText
                primary={item.label}
                secondary={item.description}
                primaryTypographyProps={{ fontWeight: active ? 700 : 600 }}
                secondaryTypographyProps={{ sx: { mt: 0.25 } }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ mt: 'auto', px: 2.5, py: 2.5 }}>
        <Stack spacing={1.25}>
          <Button href="/" variant="outlined">
            Open Product App
          </Button>
          <Button
            href={legacyAdminHref}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<ExternalIcon fontSize="small" />}
            variant="outlined"
          >
            Legacy /admin
          </Button>
          <Button
            color="inherit"
            disabled={isLoggingOut}
            onClick={() => void handleLogout()}
            startIcon={<LogoutIcon fontSize="small" />}
            variant="text"
          >
            {isLoggingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );

  return (
    <ToolbarHeaderContext.Provider value={setToolbarHeader}>
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          flexDirection: isCompact ? 'column' : 'row',
          backgroundColor: 'background.default',
        }}
      >
        {isCompact ? (
          <Box
            component="aside"
            sx={{
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              backgroundColor: alpha(theme.palette.background.paper, 0.94),
            }}
          >
            {navigation}
          </Box>
        ) : (
          <Drawer
            open
            sx={{ width: DRAWER_WIDTH, flexShrink: 0 }}
            variant="permanent"
            PaperProps={{
              sx: {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
                borderRight: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              },
            }}
          >
            {navigation}
          </Drawer>
        )}

        <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
          <AppBar
            position="sticky"
            color="transparent"
            elevation={0}
            sx={{
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
              backdropFilter: 'blur(12px)',
              backgroundColor: alpha(theme.palette.background.default, 0.9),
            }}
          >
            <Toolbar sx={{ alignItems: 'flex-start', py: 2 }}>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {subtitle}
                </Typography>
              </Box>
            </Toolbar>
          </AppBar>

          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </ToolbarHeaderContext.Provider>
  );
};

export default AdminLayout;
