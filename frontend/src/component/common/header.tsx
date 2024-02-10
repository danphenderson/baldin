import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useContext } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { components } from '../../schema.d';
import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group'; // More relevant for Leads
import ApplicationIcon from '@mui/icons-material/TouchApp'; // More relevant for Applications
import DataArrayIcon from '@mui/icons-material/DataArray'; // More relevant for Data Orchestration

type UserRead = components['schemas']['UserRead'];

interface HeaderProps {
  title?: string; // Make title optional
}

const menuItems = [
  { text: 'User Profile', icon: <SettingsIcon />, path: '/settings' },
  { text: 'Job Leads', icon: <GroupIcon />, path: '/leads' },
  { text: 'Manager Hub', icon: <ApplicationIcon />, path: '/manager' },
  { text: 'Data Orchestration', icon: <DataArrayIcon />, path: '/data-orchestration' },
];


const Header: React.FC<HeaderProps> = ({ title }) => {
  const { user, setUser, token, setToken } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Function to extract a title from the current route
  const getDefaultTitle = () => {
    // Example logic to derive a title from the location
    const path = location.pathname.substring(1);
    return path.charAt(0).toUpperCase() + path.slice(1) || 'Home'; // Capitalize first letter
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
  <Box sx={{ flexGrow: 1 }}>
    <AppBar position="static">
      <Toolbar>
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
          {title || getDefaultTitle()}
          <List sx={{ display: 'flex' }}>
            {menuItems.map((item, index) => (
              <ListItem button key={index} onClick={() => navigate(item.path)}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
        {token && (
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        )}
      </Toolbar>
    </AppBar>
  </Box>
  );
};

export default Header;
