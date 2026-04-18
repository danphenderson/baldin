import React, { createContext, useContext, useMemo } from 'react';
import { StyledEngineProvider, ThemeProvider as MuiThemeProvider, useColorScheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  createBaldinTheme,
  DEFAULT_THEME_MODE,
  parseThemeMode,
  THEME_STORAGE_KEY,
  toggleThemeMode,
  type ThemeMode,
} from '../design-system/theme';

const theme = createBaldinTheme();

const ThemeModeContext = createContext<{
  mode: ThemeMode;
  setMode: (mode: ThemeMode | null) => void;
  toggleMode: () => void;
}>({
  mode: DEFAULT_THEME_MODE,
  setMode: () => {},
  toggleMode: () => {},
});

export const useThemeMode = () => useContext(ThemeModeContext);

const ThemeModeBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mode, setMode } = useColorScheme();
  const resolvedMode = parseThemeMode(mode);

  const value = useMemo(
    () => ({
      mode: resolvedMode,
      setMode: (nextMode: ThemeMode | null) => setMode(nextMode),
      toggleMode: () => setMode(toggleThemeMode(resolvedMode)),
    }),
    [resolvedMode, setMode],
  );

  return (
    <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>
  );
};

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <StyledEngineProvider injectFirst>
      <MuiThemeProvider
        theme={theme}
        defaultMode={DEFAULT_THEME_MODE}
        modeStorageKey={THEME_STORAGE_KEY}
        forceThemeRerender
      >
        <CssBaseline />
        <ThemeModeBridge>{children}</ThemeModeBridge>
      </MuiThemeProvider>
    </StyledEngineProvider>
  );
};

export default ThemeProvider;
