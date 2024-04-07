import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import { useContext } from "react";
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { List, ListItem, ListItemText } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import ApplicationIcon from '@mui/icons-material/TouchApp';
import DataArrayIcon from '@mui/icons-material/DataArray';

const menuItems = [
  { text: 'Leads', icon: <GroupIcon />, path: '/leads' },
  { text: 'Applications', icon: <ApplicationIcon />, path: '/applications' },
  { text: 'Data Orchestration', icon: <DataArrayIcon />, path: '/data-orchestration' },
];

const Header: React.FC<{ title?: string }> = ({ title }) => {
  const { user, setToken } = useContext(UserContext);
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleLogout = () => {
    setToken(null);
    navigate('/login');
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
            {menuItems.map((item, index) => (
              <ListItem button key={index} onClick={() => navigate(item.path)}>
                <ListItemText primary={item.text} />
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
