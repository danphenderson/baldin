import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';


function Copyright(props) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      <Link color="inherit" href="https://baldin.app/">
          baldin.app
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}
const Footer = ({ title }) => {
  return (
  <Box sx={{ flexGrow: 1 }}>
    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
        {title}
    </Typography>
    <Copyright sx={{ mt: 5 }} />
  </Box>
  );
};

export default Footer;