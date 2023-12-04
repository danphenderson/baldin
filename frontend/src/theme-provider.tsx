import React, { ReactNode } from 'react';
import { blue, pink, grey } from '@mui/material/colors';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';

// Typing the theme object
const theme = createTheme({
  palette: {
    primary: blue,
    secondary: pink,
    text: {
      primary: grey[900],
      secondary: grey[700],
    },
    background: {
      default: '#eee',
      paper: '#fff',
    },
    divider: grey[300],
  },
  spacing: 8,
  typography: {
    fontFamily: [
      '"Hiragino Sans"',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
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
      styleOverrides: {},
    },
    MuiTextField: {
      defaultProps: {
        variant: 'filled',
      },
    },
  },
});

// Define the type for the ThemeProvider's props
interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};

export default ThemeProvider;
