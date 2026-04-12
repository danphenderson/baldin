import type { Components, Theme } from '@mui/material/styles';
import { cardSurfaceGradient } from '../tokens/effects';
import { getColorTokens } from '../tokens/color';

export function getComponentOverrides(theme: Theme): Components<Theme> {
  const colors = getColorTokens(theme.palette.mode);
  const { radius, elevation } = theme.baldin;

  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': { width: '6px', height: '6px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.divider,
            borderRadius: '3px',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 20px',
        },
        contained: {
          boxShadow: elevation.flat,
          '&:hover': {
            boxShadow: elevation.interactive(theme.palette.primary.main, 0.25),
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          ...(theme.palette.mode === 'dark' && { border: `1px solid ${colors.borderSubtle}` }),
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          ...(theme.palette.mode === 'dark' && {
            background: cardSurfaceGradient(theme),
            border: `1px solid ${colors.borderSubtle}`,
            backdropFilter: 'blur(10px)',
          }),
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: radius.md,
          },
        },
      },
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: radius.sm,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: radius.xl,
          ...(theme.palette.mode === 'dark' && {
            background: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
          }),
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: radius.xs,
          height: 6,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: radius.sm,
          fontSize: '0.75rem',
          fontWeight: 500,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: radius.lg,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 40,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          ...(theme.palette.mode === 'dark' && { borderColor: theme.palette.divider }),
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: radius.lg,
          ...(theme.palette.mode === 'dark' && {
            background: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
          }),
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: elevation.flat,
          borderBottom: `1px solid ${theme.palette.divider}`,
        },
      },
    },
  };
}
