import React, { ReactNode, useState, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { blue, pink, grey } from '@mui/material/colors';

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize darkMode state with value from localStorage or default to false
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true' ? true : false;
  });

  // Update localStorage whenever darkMode changes
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

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
            // Global button style overrides can be placed here
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'filled',
        },
      },
      MuiStack: {
        defaultProps: {
          useFlexGap: true,
        },
      },
    },
  });

  // Toggle dark mode function
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
