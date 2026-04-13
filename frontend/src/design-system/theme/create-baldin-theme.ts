import { createTheme, type Theme } from '@mui/material/styles';
import {
  alphaTokens,
  fontFamilies,
  getColorTokens,
  getElevationTokens,
  getStatusTokens,
  motionTokens,
  radiusTokens,
} from '../tokens';
import { getPaletteOptions } from './palette';
import { getShapeOptions } from './shape';
import { getComponentOverrides } from './components';
import { getTypographyOptions } from './typography';
import type { ThemeMode } from './theme-mode';

function createBaldinThemeTokens(theme: Theme) {
  const colors = getColorTokens(theme.palette.mode);

  return {
    status: getStatusTokens(theme),
    alpha: alphaTokens,
    radius: radiusTokens,
    elevation: getElevationTokens(theme),
    motion: motionTokens,
    fontFamily: fontFamilies,
    surface: colors.surface,
    border: colors.border,
    state: colors.state,
  } as const;
}

export function createBaldinTheme(mode: ThemeMode) {
  const baseTheme = createTheme({
    palette: getPaletteOptions(mode),
    typography: getTypographyOptions(),
    shape: getShapeOptions(),
  });

  const foundationTheme = createTheme(baseTheme, {
    baldin: createBaldinThemeTokens(baseTheme),
  });

  return createTheme(foundationTheme, {
    components: getComponentOverrides(foundationTheme),
  });
}
