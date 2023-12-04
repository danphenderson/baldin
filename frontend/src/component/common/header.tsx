import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useContext } from "react";
import { UserContext } from "../../context/user-context";
import { useNavigate, useLocation } from 'react-router-dom';

// Update the type for the Header's props
interface HeaderProps {
  title?: string; // Make title optional
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const [token, setToken] = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Function to extract a title from the current route
  const getDefaultTitle = () => {
    // Logic to derive a title from the location
    // For example, you might want to format the pathname or use a mapping
    return location.pathname.substring(1) || 'home'; // Customize as needed
  };

  const handleLogout = () => {
    setToken(null);
  };

  const handleSettings = () => {
    navigate('/settings');
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {title || getDefaultTitle()}
          </Typography>
          {token && <Button color="inherit" onClick={handleLogout}>Logout</Button>}
          {token && <Button color="inherit" onClick={handleSettings}>Settings</Button>}
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default Header;
