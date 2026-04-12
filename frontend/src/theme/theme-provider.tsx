import React, { createContext, useContext, useMemo, useState } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  createBaldinTheme,
  DEFAULT_THEME_MODE,
  parseThemeMode,
  THEME_STORAGE_KEY,
  toggleThemeMode,
  type ThemeMode,
} from '../design-system/theme';

const ThemeModeContext = createContext<{ mode: ThemeMode; toggleMode: () => void }>({
  mode: DEFAULT_THEME_MODE,
  toggleMode: () => {},
});

export const useThemeMode = () => useContext(ThemeModeContext);

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(
    () => parseThemeMode(localStorage.getItem(THEME_STORAGE_KEY))
  );

  const toggleMode = () => {
    setMode((prev) => {
      const next = toggleThemeMode(prev);
      localStorage.setItem(THEME_STORAGE_KEY, next);
      return next;
    });
  };

  const theme = useMemo(() => createBaldinTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeModeContext.Provider>
  );
};

export default ThemeProvider;
