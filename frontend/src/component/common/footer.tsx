import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';

// Typing the props for Copyright
interface CopyrightProps {
  [key: string]: any; // Accepts any prop that Typography can take
}

function Copyright(props: CopyrightProps) {
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

// Typing the props for Footer
interface FooterProps {
  title: string;
}

const Footer: React.FC<FooterProps> = ({ title }) => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Copyright sx={{ mt: 5 }} />
    </Box>
  );
};

export default Footer;
