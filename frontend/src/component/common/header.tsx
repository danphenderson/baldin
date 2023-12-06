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

type UserRead = components['schemas']['UserRead'];

interface HeaderProps {
  title?: string; // Make title optional
}

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
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title || (user && `Welcome, ${user.first_name}`) || getDefaultTitle()}
          </Typography>
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
