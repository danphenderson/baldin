import * as React from 'react';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';



const Footer: React.FC = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
        {'Copyright © '}
        <Link color="inherit" href="https://baldin.app/">
          baldin.app
        </Link>{' '}
        {new Date().getFullYear()}
      </Typography>

      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
        <Link color="inherit" href="/user-terms">
          Privacy Policy and Terms and Conditions
        </Link>{' '}
      </Typography>
    </Box>
  );
};

export default Footer;
