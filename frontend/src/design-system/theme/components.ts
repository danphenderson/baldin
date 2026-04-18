import { alpha, type Components, type Theme } from '@mui/material/styles';
import { brandGradient, brandHoverGradient, cardSurfaceGradient } from '../tokens/effects';
import { getColorTokens } from '../tokens/color';

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    brand: true;
  }
}

export function getComponentOverrides(theme: Theme): Components<Theme> {
  const colors = getColorTokens(theme.palette.mode);
  const { radius, elevation, surface, border, state } = theme.baldin;

  return {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          colorScheme: theme.palette.mode,
        },
        body: {
          scrollbarWidth: 'thin',
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
          '&::-webkit-scrollbar': { width: '6px', height: '6px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.divider,
            borderRadius: '3px',
          },
          '& ::selection': {
            background: state.selected,
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
          padding: '9px 18px',
          boxShadow: 'none',
          transition: [
            'background-color 180ms ease',
            'border-color 180ms ease',
            'box-shadow 180ms ease',
            'transform 180ms ease',
          ].join(', '),
          '&.Mui-focusVisible': {
            boxShadow: `0 0 0 4px ${state.focusRing}`,
          },
        },
        outlined: {
          borderRadius: radius.sm,
          borderColor: border.default,
          color: theme.palette.text.primary,
          '&:hover': {
            borderColor: border.strong,
            backgroundColor: state.hover,
          },
        },
        text: {
          color: theme.palette.text.primary,
          '&:hover': {
            backgroundColor: state.hover,
          },
        },
        contained: {
          boxShadow: elevation.flat,
          '&:active': {
            transform: 'translateY(1px)',
          },
          '&:hover': {
            boxShadow: elevation.interactive(theme.palette.primary.main, 0.25),
          },
        },
      },
      variants: [
        {
          props: { variant: 'brand' },
          style: {
            color: theme.palette.common.white,
            background: brandGradient(theme),
            boxShadow: elevation.interactive(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.34 : 0.24),
            '&:hover': {
              background: brandHoverGradient(theme),
              boxShadow: elevation.interactive(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.42 : 0.3),
            },
            '&:active': {
              transform: 'translateY(1px)',
            },
            '&.Mui-disabled': {
              color: alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.7 : 0.78),
              boxShadow: 'none',
            },
            '&.Mui-focusVisible': {
              boxShadow: `0 0 0 4px ${state.focusRing}`,
            },
          },
        },
      ],
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': {
            outline: 'none',
            boxShadow: `0 0 0 4px ${state.focusRing}`,
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          transition: 'background-color 180ms ease, color 180ms ease, box-shadow 180ms ease',
          '&:hover': {
            backgroundColor: state.hover,
          },
          '&.Mui-selected': {
            backgroundColor: state.selected,
            color: theme.palette.primary.main,
            boxShadow: `inset 3px 0 0 ${theme.palette.primary.main}`,
            '& .MuiListItemIcon-root': {
              color: theme.palette.primary.main,
            },
            '&:hover': {
              backgroundColor: state.pressed,
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: surface.raised,
          border: `1px solid ${border.default}`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: cardSurfaceGradient(theme),
          border: `1px solid ${border.default}`,
          boxShadow: elevation.flat,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          backgroundColor: surface.inset,
          transition: 'box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: border.default,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: border.strong,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 4px ${state.focusRing}`,
            backgroundColor: surface.base,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: radius.sm,
          backgroundColor: surface.inset,
          border: `1px solid ${border.subtle}`,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: radius.xl,
          background: surface.overlay,
          border: `1px solid ${border.default}`,
          boxShadow: elevation.floating,
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
          backgroundColor: theme.palette.mode === 'dark' ? colors.surface.overlay : '#0f172a',
          color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#f8fafc',
          border: `1px solid ${theme.palette.mode === 'dark' ? border.default : alpha('#ffffff', 0.12)}`,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: radius.lg,
          border: `1px solid ${border.default}`,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 40,
          borderRadius: radius.sm,
          '&:hover': {
            backgroundColor: state.hover,
          },
          '&.Mui-selected': {
            backgroundColor: state.selected,
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: surface.base,
          borderColor: border.default,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: radius.lg,
          background: surface.overlay,
          border: `1px solid ${border.default}`,
          boxShadow: elevation.floating,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: elevation.flat,
          backgroundColor: alpha(surface.base, theme.palette.mode === 'dark' ? 0.92 : 0.86),
          backdropFilter: 'blur(18px)',
          borderBottom: `1px solid ${border.default}`,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.common.white, 0.08)
            : alpha(theme.palette.common.black, 0.06),
        },
      },
    },
  };
}
