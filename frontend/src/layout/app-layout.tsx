import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  AppBar, Toolbar, Typography, IconButton, Chip, Divider, Collapse,
  useTheme, alpha, Tooltip, Badge, ClickAwayListener, useMediaQuery,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  WorkOutline as LeadsIcon,
  Assignment as ApplicationsIcon,
  Person as ProfileIcon,
  Hub as PipelinesIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  AutoAwesome as AutoAwesomeIcon,
  Description as WorkspaceIcon,
  Settings as SettingsIcon,
  ForumOutlined as MessagesIcon,
  PeopleAltOutlined as PeopleIcon,
  ConnectWithoutContact as ConnectionsIcon,
  TravelExplore as DiscoverIcon,
  SmartToyOutlined as AgentsIcon,
  TrendingUp as AspirationsIcon,
  Badge as RolesIcon,
  BusinessOutlined as CompaniesIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import { logout as logoutApi } from '../service/auth';
import { getUnreadCount } from '../service/messages';
import { useThemeMode } from '../theme/theme-provider';
import { avatarUrl } from '../service/users';
import { ToolbarHeaderContext, type ToolbarHeaderContent } from './toolbar-header-context';
import SecondaryNavBar from '../component/common/secondary-nav-bar';
import ErrorBoundary from '../component/common/error-boundary';
import UserAvatar from '../component/common/user-avatar';
import {
  getSecondaryNavItems,
  drawerSections,
  userRailItems,
  type NavigationItem,
  type NavigationLinkItem,
  type NavigationGroupItem,
  type NavIconKey,
} from '../route/navigation';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED = 72;

const navIcons: Record<NavIconKey, React.ReactNode> = {
  dashboard: <DashboardIcon />,
  leads: <LeadsIcon />,
  applications: <ApplicationsIcon />,
  messages: <MessagesIcon />,
  people: <PeopleIcon />,
  connections: <ConnectionsIcon />,
  discover: <DiscoverIcon />,
  agents: <AgentsIcon />,
  workflows: <PipelinesIcon />,
  workspace: <WorkspaceIcon />,
  profile: <ProfileIcon />,
  settings: <SettingsIcon />,
  aspirations: <AspirationsIcon />,
  roles: <RolesIcon />,
  companies: <CompaniesIcon />,
};

function isPathActive(pathname: string, path: string): boolean {
  if (path === '/') {
    return pathname === '/';
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

function collectDefaultExpanded(items: NavigationItem[], state: Record<string, boolean> = {}): Record<string, boolean> {
  for (const item of items) {
    if (item.kind === 'group') {
      state[item.id] = Boolean(item.defaultExpanded);
    }
  }

  return state;
}

const HEADER_ACTION_DIAL_ID = 'header-account-actions';
const HEADER_ACTION_STAGGER_MS = 70;

const AppLayout: React.FC = () => {
  const theme = useTheme();
  const isCompactToolbar = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, setToken, setUser } = useContext(UserContext);
  const { mode, toggleMode } = useThemeMode();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initialState = drawerSections.reduce<Record<string, boolean>>((state, section) => {
      collectDefaultExpanded(section.items, state);
      return state;
    }, {});

    return collectDefaultExpanded(userRailItems, initialState);
  });
  const [isAccountDialOpen, setIsAccountDialOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [toolbarHeader, setToolbarHeader] = useState<ToolbarHeaderContent | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnread = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getUnreadCount(token);
      setUnreadCount(data.total_unread);
    } catch {
      // Silently ignore — badge is best-effort
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setUnreadCount(0);
      return undefined;
    }
    fetchUnread();
    intervalRef.current = setInterval(fetchUnread, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token, fetchUnread]);

  const drawerWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;
  const textTransition = 'opacity 0.2s ease, max-width 0.2s ease';
  const accountRailWidth = isCompactToolbar ? 184 : 270;
  const secondaryNavItems = getSecondaryNavItems(location.pathname)
    ?.filter((item) => !item.superuserOnly || user?.is_superuser) ?? null;
  const isSuperuser = Boolean(user?.is_superuser);
  const displayName = (user as any)?.first_name
    ? `${(user as any).first_name} ${(user as any).last_name ?? ''}`.trim()
    : user?.email ?? 'Profile';

  const closeAccountDial = () => setIsAccountDialOpen(false);

  useEffect(() => {
    setExpandedGroups((current) => {
      const next = { ...current };
      let changed = false;

      const maybeOpenGroups = (items: NavigationItem[]) => {
        for (const item of items) {
          if (item.kind === 'group' && item.children.some((child) => isPathActive(location.pathname, child.path))) {
            if (!next[item.id]) {
              next[item.id] = true;
              changed = true;
            }
          }
        }
      };

      drawerSections.forEach((section) => maybeOpenGroups(section.items));
      maybeOpenGroups(userRailItems);

      return changed ? next : current;
    });
  }, [location.pathname]);

  useEffect(() => {
    if (!isAccountDialOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAccountDialOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAccountDialOpen]);

  const clearLocalAuth = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('baldin_token');
    navigate('/login');
  };

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
      closeAccountDial();
      clearLocalAuth();
      setIsLoggingOut(false);
    }
  };

  const handleThemeToggle = () => {
    toggleMode();
    closeAccountDial();
  };

  const userAvatarSrc = user
    ? avatarUrl(user.id, (user as any).avatar_uri)
    : undefined;

  const accountActions = [
    {
      key: 'logout',
      label: isLoggingOut ? 'Signing Out...' : 'Sign Out',
      icon: <LogoutIcon fontSize="small" />,
      onClick: handleLogout,
      color: theme.palette.error.main,
      background: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.16 : 0.08),
      borderColor: alpha(theme.palette.error.main, 0.26),
      shadow: alpha(theme.palette.error.main, 0.16),
      disabled: isLoggingOut,
    },
    {
      key: 'theme',
      label: isCompactToolbar ? (mode === 'dark' ? 'Light' : 'Dark') : (mode === 'dark' ? 'Light Theme' : 'Dark Theme'),
      icon: mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />,
      onClick: handleThemeToggle,
      color: theme.palette.secondary.main,
      background: alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1),
      borderColor: alpha(theme.palette.secondary.main, 0.28),
      shadow: alpha(theme.palette.secondary.main, 0.18),
      disabled: isLoggingOut,
    },
  ];

  const toggleGroup = (groupId: string) => {
    if (collapsed) {
      setCollapsed(false);
      setExpandedGroups((current) => ({ ...current, [groupId]: true }));
      return;
    }

    setExpandedGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  };

  const renderNavItem = (item: NavigationItem, depth = 0): React.ReactNode => {
    const isNested = depth > 0;

    if (item.kind === 'group') {
      const isActive = item.children.some((child) => isPathActive(location.pathname, child.path));
      const isOpen = !collapsed && Boolean(expandedGroups[item.id]);

      return (
        <React.Fragment key={item.id}>
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <Tooltip title={item.label} placement="right" disableHoverListener={!collapsed}>
              <ListItemButton
                onClick={() => toggleGroup(item.id)}
                sx={{
                  borderRadius: 2,
                  minHeight: isNested ? 40 : 44,
                  px: collapsed ? 1.75 : 2,
                  pl: collapsed ? 1.75 : 2 + (depth * 1.5),
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
                    minWidth: collapsed ? 'auto' : 40,
                    color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                    justifyContent: 'center',
                  }}
                >
                  {navIcons[item.icon]}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  sx={{
                    flex: collapsed ? '0 0 0' : '1 1 auto',
                    opacity: collapsed ? 0 : 1,
                    maxWidth: collapsed ? 0 : 160,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    transition: textTransition,
                    '& .MuiTypography-root': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  }}
                  primaryTypographyProps={{
                    fontSize: isNested ? '0.8125rem' : '0.875rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                  }}
                />
                {!collapsed && (
                  isOpen ? (
                    <ExpandLessIcon sx={{ color: isActive ? theme.palette.primary.main : theme.palette.text.secondary }} />
                  ) : (
                    <ExpandMoreIcon sx={{ color: isActive ? theme.palette.primary.main : theme.palette.text.secondary }} />
                  )
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>

          {!collapsed && (
            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <List disablePadding sx={{ mt: 0.25 }}>
                {item.children.map((child) => renderNavItem(child, depth + 1))}
              </List>
            </Collapse>
          )}
        </React.Fragment>
      );
    }

    const isActive = isPathActive(location.pathname, item.path);

    return (
      <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
        <Tooltip title={item.label} placement="right" disableHoverListener={!collapsed}>
          <ListItemButton
            onClick={() => navigate(item.path)}
            sx={{
              borderRadius: 2,
              minHeight: isNested ? 40 : 44,
              px: collapsed ? 1.75 : 2,
              pl: collapsed ? 1.75 : 2 + (depth * 1.5),
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
                minWidth: collapsed ? 'auto' : 40,
                color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                justifyContent: 'center',
              }}
            >
              {item.badge === 'unreadMessages' ? (
                <Badge badgeContent={unreadCount} color="error" max={99}>
                  {navIcons[item.icon]}
                </Badge>
              ) : (
                navIcons[item.icon]
              )}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              sx={{
                flex: collapsed ? '0 0 0' : '1 1 auto',
                opacity: collapsed ? 0 : 1,
                maxWidth: collapsed ? 0 : 160,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: textTransition,
                '& .MuiTypography-root': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
              }}
              primaryTypographyProps={{
                fontSize: isNested ? '0.8125rem' : '0.875rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
              }}
            />
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Skip to content link for keyboard users */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          zIndex: 9999,
          '&:focus': {
            position: 'fixed',
            top: 8,
            left: 8,
            width: 'auto',
            height: 'auto',
            overflow: 'visible',
            bgcolor: 'background.paper',
            color: 'primary.main',
            px: 2,
            py: 1,
            borderRadius: 1,
            boxShadow: 4,
            fontWeight: 600,
            fontSize: '0.875rem',
            textDecoration: 'none',
          },
        }}
      >
        Skip to main content
      </Box>

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
            display: 'flex',
            flexDirection: 'column',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(180deg, #0f1629 0%, #0a0e1a 100%)'
              : theme.palette.background.paper,
            borderRight: `1px solid ${theme.palette.divider}`,
            overflowX: 'hidden',
          },
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            p: collapsed ? 1.5 : 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 1.5,
            minHeight: 64,
          }}
        >
          {collapsed ? (
            <Tooltip title="Open navigation" placement="right">
              <IconButton
                size="small"
                aria-label="Open navigation"
                onClick={() => setCollapsed(false)}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '12px',
                  color: theme.palette.text.secondary,
                  border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                  backgroundColor: alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.04 : 0.5),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.12),
                    color: theme.palette.primary.main,
                  },
                }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                }}
              >
                <AutoAwesomeIcon sx={{ color: '#fff', fontSize: 20 }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  opacity: 1,
                  maxWidth: 120,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  transition: textTransition,
                }}
              >
                Baldin
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <IconButton
                size="small"
                aria-label="Collapse navigation"
                onClick={() => setCollapsed(true)}
                sx={{ color: theme.palette.text.secondary }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>

        <Divider sx={{ opacity: 0.5 }} />

        {/* Nav Items */}
        <List component="nav" aria-label="Main navigation" sx={{ px: 1, py: 1.5, flexGrow: 0, overflowY: 'auto' }}>
          {drawerSections.map((section) => (
            <React.Fragment key={section.key}>
              {section.label != null && (
                collapsed ? (
                  <Divider sx={{ my: 1, mx: 0.5, opacity: 0.3 }} />
                ) : (
                  <>
                    <Divider sx={{ my: 0.75, opacity: 0.4 }} />
                    <Typography
                      variant="overline"
                      sx={{
                        display: 'block',
                        px: 2,
                        pt: 1.5,
                        pb: 0.5,
                        color: 'text.secondary',
                        fontSize: '0.6875rem',
                        letterSpacing: '0.08em',
                        lineHeight: 1,
                      }}
                    >
                      {section.label}
                    </Typography>
                  </>
                )
              )}

              {section.items.map((item) => renderNavItem(item))}
            </React.Fragment>
          ))}
        </List>

        {/* Spacer pushes footer to bottom */}
        <Box sx={{ flexGrow: 1 }} />

        <Divider sx={{ opacity: 0.4 }} />

        {/* User rail */}
        <Box sx={{ flexShrink: 0, px: 1, py: 1 }}>
          <Tooltip title={displayName} placement="right" disableHoverListener={!collapsed}>
            <Box
              sx={{
                px: collapsed ? 0 : 1.5,
                py: collapsed ? 0.75 : 1.25,
                mb: 0.75,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: 1.25,
                backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.08),
              }}
            >
              <UserAvatar
                userId={user?.id}
                avatarUri={(user as any)?.avatar_uri}
                firstName={(user as any)?.first_name}
                lastName={(user as any)?.last_name}
                email={user?.email}
                sx={{ width: 34, height: 34, fontSize: '0.875rem', flexShrink: 0 }}
              />
              {!collapsed && (
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {user?.email ?? 'Career profile'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Tooltip>

          <List component="nav" aria-label="Profile navigation" sx={{ p: 0 }}>
            {userRailItems.map((item) => renderNavItem(item))}
          </List>
        </Box>
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
          <Toolbar sx={{ justifyContent: 'space-between', gap: 2, minHeight: 72 }}>
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'baseline',
                flexWrap: 'wrap',
                columnGap: 0.75,
                rowGap: 0.25,
                pr: 1,
              }}
            >
              {toolbarHeader && (
                <>
                  <Typography
                    component="h1"
                    variant={isCompactToolbar ? 'h6' : 'h5'}
                    sx={{
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.1,
                    }}
                  >
                    {toolbarHeader.title}
                  </Typography>
                  {toolbarHeader.subtitle && (
                    <Typography
                      variant={isCompactToolbar ? 'body2' : 'body1'}
                      color="text.secondary"
                      sx={{
                        minWidth: 0,
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: isCompactToolbar ? 'normal' : 'nowrap',
                      }}
                    >
                      {toolbarHeader.subtitle}
                    </Typography>
                  )}
                </>
              )}
            </Box>

            <ClickAwayListener onClickAway={closeAccountDial}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  minWidth: 0,
                  maxWidth: '100%',
                }}
              >
                <Box
                  id={HEADER_ACTION_DIAL_ID}
                  role="group"
                  aria-label="Account actions"
                  aria-hidden={!isAccountDialOpen}
                  sx={{
                    width: isAccountDialOpen ? accountRailWidth : 0,
                    maxWidth: isCompactToolbar ? 'calc(100vw - 132px)' : 'calc(100vw - 272px)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    transition: 'width 320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                  }}
                >
                  {accountActions.map((action, index) => {
                    const delayIndex = isAccountDialOpen
                      ? accountActions.length - 1 - index
                      : index;

                    return (
                      <Box
                        key={action.key}
                        sx={{
                          maxWidth: isAccountDialOpen ? (isCompactToolbar ? 104 : 148) : 0,
                          mr: isAccountDialOpen ? 1 : 0,
                          opacity: isAccountDialOpen ? 1 : 0,
                          transform: isAccountDialOpen ? 'translateY(0)' : 'translateY(-14px)',
                          overflow: 'hidden',
                          pointerEvents: isAccountDialOpen && !action.disabled ? 'auto' : 'none',
                          transition: [
                            'max-width 280ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                            'margin-right 280ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                            'opacity 180ms ease',
                            'transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                          ].join(', '),
                          transitionDelay: `${delayIndex * HEADER_ACTION_STAGGER_MS}ms`,
                        }}
                      >
                        <Chip
                          clickable
                          icon={action.icon}
                          label={action.label}
                          onClick={action.disabled ? undefined : action.onClick}
                          sx={{
                            height: 38,
                            borderRadius: '999px',
                            justifyContent: 'flex-start',
                            borderColor: action.borderColor,
                            color: action.color,
                            backgroundColor: action.background,
                            backdropFilter: 'blur(14px)',
                            boxShadow: `0 10px 24px ${action.shadow}`,
                            opacity: action.disabled ? 0.78 : 1,
                            '& .MuiChip-icon': {
                              color: 'inherit',
                              ml: 1,
                            },
                            '& .MuiChip-label': {
                              px: 1.25,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            },
                            '&:hover': {
                              backgroundColor: alpha(action.color, theme.palette.mode === 'dark' ? 0.24 : 0.14),
                              borderColor: alpha(action.color, 0.4),
                            },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Box>

                <Tooltip title={isAccountDialOpen ? 'Close account actions' : 'Open account actions'}>
                  <IconButton
                    onClick={() => setIsAccountDialOpen((prev) => !prev)}
                    aria-controls={HEADER_ACTION_DIAL_ID}
                    aria-expanded={isAccountDialOpen ? 'true' : undefined}
                    aria-label={isAccountDialOpen ? 'Close account actions' : 'Open account actions'}
                    sx={{
                      p: 0.5,
                      borderRadius: '999px',
                      backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.62 : 0.82),
                      boxShadow: isAccountDialOpen
                        ? `0 0 0 4px ${alpha(theme.palette.primary.main, 0.12)}`
                        : 'none',
                      transition: 'background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.76 : 0.94),
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    <Badge
                      overlap="circular"
                      anchorOrigin={isSuperuser
                        ? { vertical: 'top', horizontal: 'right' }
                        : { vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={isSuperuser ? <AutoAwesomeIcon sx={{ fontSize: 12 }} /> : undefined}
                      variant={isSuperuser ? 'standard' : 'dot'}
                      sx={{
                        '& .MuiBadge-badge': isSuperuser
                          ? {
                            minWidth: 18,
                            height: 18,
                            borderRadius: '50%',
                            backgroundColor: theme.palette.warning.main,
                            color: theme.palette.getContrastText(theme.palette.warning.main),
                            boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                            padding: 0,
                          }
                          : {
                            backgroundColor: theme.palette.success.main,
                          },
                      }}
                    >
                      <UserAvatar
                        userId={user?.id}
                        avatarUri={(user as any)?.avatar_uri}
                        firstName={(user as any)?.first_name}
                        lastName={(user as any)?.last_name}
                        email={user?.email}
                        sx={{
                          width: 36,
                          height: 36,
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          background: userAvatarSrc
                            ? undefined
                            : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        }}
                      />
                    </Badge>
                  </IconButton>
                </Tooltip>
              </Box>
            </ClickAwayListener>
          </Toolbar>
        </AppBar>

        {secondaryNavItems && <SecondaryNavBar items={secondaryNavItems} />}

        {/* Page content */}
        <Box
          component="main"
          id="main-content"
          sx={{
            flexGrow: 1,
            p: 3,
            overflow: 'auto',
            background: theme.palette.background.default,
          }}
        >
          <ToolbarHeaderContext.Provider value={setToolbarHeader}>
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </ToolbarHeaderContext.Provider>
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
