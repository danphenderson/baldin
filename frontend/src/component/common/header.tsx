import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import { useContext } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { logout as logoutApi } from '../../service/auth';

const menuItems = [
  { text: 'Leads', path: '/leads' },
  { text: 'Applications', path: '/applications' },
  { text: 'Data Orchestration', path: '/data-orchestration' },
  { text: 'Extractors', path: '/extractor' },
];

const Header: React.FC<{ title?: string }> = ({ title }) => {
  const { user, token, setToken, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const open = Boolean(anchorEl);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
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
      setToken(null);
      setUser(null);
      localStorage.removeItem('baldin_token');
      setIsLoggingOut(false);
      navigate('/login');
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            onClick={() => navigate('/profile')}
            sx={{ marginRight: 2 }}
          >
            <Avatar
              alt={user?.first_name ?? 'User'}
              src={user?.avatar_uri?.name ?? ''}
            />
          </IconButton>
          <List sx={{ display: 'flex', flexGrow: 1 }}>
            {menuItems.map((item) => (
              <ListItem disablePadding key={item.path}>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  selected={location.pathname === item.path}
                  sx={{
                    color: 'inherit',
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&.Mui-selected:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.28)',
                    },
                  }}
                >
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <SettingsIcon />
          </IconButton>
          {open && (
            <Button color="inherit" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? 'Signing out...' : 'Logout'}
            </Button>
          )}
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default Header;
