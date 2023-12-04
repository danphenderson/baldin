import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useContext } from "react";
import { UserContext } from "../../context/user-context";
import { useNavigate } from 'react-router-dom';

// Define the type for the Header's props
interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const [token, setToken] = useContext(UserContext);

  const navigate = useNavigate();

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
              {title}
          </Typography>
          {token && <Button color="inherit" onClick={handleLogout}>Logout</Button>}
          {token && <Button color="inherit" onClick={handleSettings}>User Settings</Button>}
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default Header;
