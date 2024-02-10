import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';

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
  const navigator = useNavigate();

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Copyright sx={{ mt: 5 }} />
      <Button color="text.secondary" onClick={() => {navigator('/user-terms')}}>
      Click to read our Privacy Policy and Terms and Conditions
      </Button>

    </Box>
  );
};

export default Footer;
