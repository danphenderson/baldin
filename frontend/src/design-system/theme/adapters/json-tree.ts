import type { Theme } from '@mui/material/styles';

export function jsonTreeTheme(theme: Theme) {
  const palette = theme.palette;

  return {
    scheme: 'baldin',
    base00: 'transparent',
    base01: palette.mode === 'dark' ? '#1e293b' : '#e2e8f0',
    base02: palette.mode === 'dark' ? '#334155' : '#cbd5e1',
    base03: palette.mode === 'dark' ? '#64748b' : '#94a3b8',
    base04: palette.mode === 'dark' ? '#94a3b8' : '#64748b',
    base05: palette.mode === 'dark' ? '#cbd5e1' : '#334155',
    base06: palette.mode === 'dark' ? '#e2e8f0' : '#1e293b',
    base07: palette.text.primary,
    base08: palette.error.main,
    base09: palette.warning.main,
    base0A: palette.warning.light,
    base0B: palette.success.main,
    base0C: palette.primary.main,
    base0D: palette.primary.main,
    base0E: palette.secondary.main,
    base0F: palette.error.main,
  } as const;
}
