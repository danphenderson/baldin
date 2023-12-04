import React, { ReactNode, useState } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { blue, pink, grey } from '@mui/material/colors';
import { Box } from '@mui/material';

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: blue,
      secondary: pink,
      background: {
        default: darkMode ? '#303030' : '#eee',
        paper: darkMode ? '#424242' : '#fff',
      },
      text: {
        primary: darkMode ? grey[300] : grey[900],
        secondary: darkMode ? grey[500] : grey[700],
      },
      divider: grey[300],
    },
    typography: {
      fontFamily: [
        'Roboto',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Helvetica',
        'Arial',
        'sans-serif',
      ].join(','),
    },
    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            // Add your global button style overrides here
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'filled',
        },
      },
    },
  });

  // Toggle dark mode
  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <MuiThemeProvider theme={theme}>

          <CssBaseline />
          {children}
          {/* Example Button to toggle dark mode. You can place it wherever you want in your app */}
          <button onClick={toggleDarkMode}>Toggle Dark Mode</button>
    </MuiThemeProvider>
  );
};

export default ThemeProvider;
