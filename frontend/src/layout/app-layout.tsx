import React, { useContext, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  AppBar, Toolbar, Typography, IconButton, Avatar, Menu, MenuItem, Divider,
  useTheme, alpha, Tooltip, Badge,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  WorkOutline as LeadsIcon,
  Assignment as ApplicationsIcon,
  Person as ProfileIcon,
  Description as DocumentsIcon,
  Hub as PipelinesIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  Menu as MenuIcon,
  AutoAwesome as AutoAwesomeIcon,
  Business as CompaniesIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import { useThemeMode } from '../theme/theme-provider';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED = 72;

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { label: 'Leads', icon: <LeadsIcon />, path: '/leads' },
  { label: 'Applications', icon: <ApplicationsIcon />, path: '/applications' },
  { label: 'Documents', icon: <DocumentsIcon />, path: '/documents' },
  { label: 'Companies', icon: <CompaniesIcon />, path: '/companies' },
  { label: 'Profile', icon: <ProfileIcon />, path: '/profile' },
  { label: 'Pipelines', icon: <PipelinesIcon />, path: '/pipelines' },
];

const AppLayout: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setToken, setUser } = useContext(UserContext);
  const { mode, toggleMode } = useThemeMode();
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const drawerWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('baldin_token');
    navigate('/login');
  };

  const userInitials = user
    ? `${(user as any).first_name?.[0] || ''}${(user as any).last_name?.[0] || ''}`.toUpperCase() || user.email[0].toUpperCase()
    : '?';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          transition: 'width 0.2s ease',
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            transition: 'width 0.2s ease',
            boxSizing: 'border-box',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(180deg, #0f1629 0%, #0a0e1a 100%)'
              : theme.palette.background.paper,
            borderRight: `1px solid ${theme.palette.divider}`,
            overflowX: 'hidden',
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 64 }}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            }}
          >
            <AutoAwesomeIcon sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          {!collapsed && (
            <Typography variant="h6" sx={{ fontWeight: 800, background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Baldin
            </Typography>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <IconButton size="small" onClick={() => setCollapsed(!collapsed)} sx={{ color: theme.palette.text.secondary }}>
            {collapsed ? <MenuIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        </Box>

        <Divider sx={{ opacity: 0.5 }} />

        {/* Nav Items */}
        <List sx={{ px: 1, py: 1.5, flexGrow: 1 }}>
          {navItems.map((item) => {
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <Tooltip title={collapsed ? item.label : ''} placement="right">
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    sx={{
                      borderRadius: 2,
                      minHeight: 44,
                      px: collapsed ? 2 : 2,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      ...(isActive && {
                        background: alpha(theme.palette.primary.main, 0.12),
                        borderLeft: `3px solid ${theme.palette.primary.main}`,
                        '&:hover': { background: alpha(theme.palette.primary.main, 0.18) },
                      }),
                      ...(!isActive && {
                        '&:hover': { background: alpha(theme.palette.text.primary, 0.04) },
                      }),
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: collapsed ? 0 : 40,
                        color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                        justifyContent: 'center',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontSize: '0.875rem',
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>
      </Drawer>

      {/* Main content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            background: alpha(theme.palette.background.default, 0.8),
            backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Toolbar sx={{ justifyContent: 'flex-end', gap: 1 }}>
            <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
              <IconButton onClick={toggleMode} sx={{ color: theme.palette.text.secondary }}>
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5 }}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                variant="dot"
                sx={{ '& .MuiBadge-badge': { backgroundColor: theme.palette.success.main } }}
              >
                <Avatar
                  sx={{
                    width: 36, height: 36, fontSize: '0.875rem', fontWeight: 700,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  }}
                >
                  {userInitials}
                </Avatar>
              </Badge>
            </IconButton>

            <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)} transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
              <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}>
                <ListItemIcon><ProfileIcon fontSize="small" /></ListItemIcon>
                Profile
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { setAnchorEl(null); handleLogout(); }}>
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                Sign out
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            overflow: 'auto',
            background: theme.palette.background.default,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
