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
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import { AccountCircle } from '@mui/icons-material';


type UserRead = components['schemas']['UserRead'];

interface HeaderProps {
  title?: string; // Make title optional
}

const menuItems = [
  { text: 'Leads', icon: <GroupIcon />, path: '/leads' },
  { text: 'Manager Hub', icon: <ApplicationIcon />, path: '/manager' },
  { text: 'Data Orchestration', icon: <DataArrayIcon />, path: '/data-orchestration' },
];


const Header: React.FC<HeaderProps> = ({ title }) => {
  const { user, setUser, token, setToken } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);


  // App bar handlers
  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    // check to see if it is open, if so, close it
    if (open) {
      setAnchorEl(null);
      return;
    }
    setAnchorEl(event.currentTarget);
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
      { token && (
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>

          {/* Display User Application MenuItems */}
          {/* TODO: This should be displayed in MenuIcon (the same way User Setting Options are displayed) and the title should appear on the page */}
          <List sx={{ display: 'flex' }}>
            {menuItems.map((item, index) => (
              <ListItem button key={index} onClick={() => navigate(item.path)}>
                {/* Uncoment for icons  */}
                {/* <ListItemIcon>{item.icon}</ListItemIcon> */}
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>

          {/* Display User Setting Options */}
          <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
            <SettingsIcon />
              { open && (
                <>
                  <Button color="inherit" onClick={() => navigate('/settings')}>
                    Settings
                  </Button>
                  <Button color="inherit" onClick={handleLogout}>
                    Logout
                  </Button>
                </>
              )}
          </IconButton>
        </Box>
      )}
      </Toolbar>
    </AppBar>
  </Box>
  );
};

export default Header;
