import React, { createContext, useContext, useMemo, useState } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

type ThemeMode = 'dark' | 'light';

const ThemeModeContext = createContext<{ mode: ThemeMode; toggleMode: () => void }>({
  mode: 'dark',
  toggleMode: () => {},
});

export const useThemeMode = () => useContext(ThemeModeContext);

const getDesignTokens = (mode: ThemeMode) => ({
  palette: {
    mode,
    ...(mode === 'dark'
      ? {
          primary: { main: '#06b6d4', light: '#22d3ee', dark: '#0891b2' },
          secondary: { main: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed' },
          success: { main: '#10b981', light: '#34d399', dark: '#059669' },
          warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
          error: { main: '#f43f5e', light: '#fb7185', dark: '#e11d48' },
          background: { default: '#0a0e1a', paper: '#111827' },
          text: { primary: '#f1f5f9', secondary: '#94a3b8' },
          divider: 'rgba(148, 163, 184, 0.12)',
        }
      : {
          primary: { main: '#0891b2', light: '#06b6d4', dark: '#0e7490' },
          secondary: { main: '#7c3aed', light: '#8b5cf6', dark: '#6d28d9' },
          success: { main: '#059669' },
          warning: { main: '#d97706' },
          error: { main: '#e11d48' },
          background: { default: '#f8fafc', paper: '#ffffff' },
          text: { primary: '#0f172a', secondary: '#475569' },
        }),
  },
  typography: {
    fontFamily: '"Source Sans 3", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontFamily: '"Space Grotesk", "Source Sans 3", sans-serif', fontWeight: 700, letterSpacing: '-0.03em' },
    h2: { fontFamily: '"Space Grotesk", "Source Sans 3", sans-serif', fontWeight: 700, letterSpacing: '-0.03em' },
    h3: { fontFamily: '"Space Grotesk", "Source Sans 3", sans-serif', fontWeight: 700, letterSpacing: '-0.025em' },
    h4: { fontFamily: '"Space Grotesk", "Source Sans 3", sans-serif', fontWeight: 600 },
    h5: { fontFamily: '"Space Grotesk", "Source Sans 3", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Space Grotesk", "Source Sans 3", sans-serif', fontWeight: 600 },
    subtitle2: { fontFamily: '"Space Grotesk", "Source Sans 3", sans-serif', fontWeight: 500, fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase' as const },
    button: { fontFamily: '"Space Grotesk", "Source Sans 3", sans-serif', fontWeight: 600, letterSpacing: '0.02em' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin' as const,
          '&::-webkit-scrollbar': { width: '6px', height: '6px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(148,163,184,0.3)', borderRadius: '3px' },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, textTransform: 'none' as const, fontWeight: 600, padding: '8px 20px' },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: '0 4px 14px 0 rgba(6,182,212,0.25)' } },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          ...(mode === 'dark' && { border: '1px solid rgba(148,163,184,0.08)' }),
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          ...(mode === 'dark' && {
            background: 'linear-gradient(135deg, rgba(17,24,39,0.8) 0%, rgba(17,24,39,0.95) 100%)',
            border: '1px solid rgba(148,163,184,0.08)',
            backdropFilter: 'blur(10px)',
          }),
        },
      },
    },
    MuiTextField: {
      styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 10 } } },
      defaultProps: { variant: 'outlined' as const },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 500, borderRadius: 8 } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          ...(mode === 'dark' && { background: '#111827', border: '1px solid rgba(148,163,184,0.12)' }),
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 4, height: 6 } },
    },
  },
});

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(
    () => (localStorage.getItem('baldin_theme') as ThemeMode) || 'dark'
  );

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('baldin_theme', next);
      return next;
    });
  };

  const theme = useMemo(() => createTheme(getDesignTokens(mode) as any), [mode]);

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
