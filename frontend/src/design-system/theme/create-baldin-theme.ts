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
import { DEFAULT_THEME_MODE, type ThemeMode } from './theme-mode';

function createBaldinThemeTokens(mode: ThemeMode, theme: Theme) {
  const colors = getColorTokens(mode);

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

function createSchemeTheme(mode: ThemeMode) {
  const baseTheme = createTheme({
    palette: getPaletteOptions(mode),
    typography: getTypographyOptions(),
    shape: getShapeOptions(),
  });

  const foundationTheme = createTheme(baseTheme, {
    baldin: createBaldinThemeTokens(mode, baseTheme),
  });

  return createTheme(foundationTheme, {
    components: getComponentOverrides(foundationTheme),
  });
}

export function createBaldinTheme(mode: ThemeMode = DEFAULT_THEME_MODE) {
  const lightTheme = createSchemeTheme('light');
  const darkTheme = createSchemeTheme('dark');
  const defaultTheme = mode === 'light' ? lightTheme : darkTheme;

  return createTheme({
    cssVariables: { colorSchemeSelector: 'data' },
    defaultColorScheme: mode,
    palette: defaultTheme.palette,
    baldin: defaultTheme.baldin,
    components: defaultTheme.components,
    typography: getTypographyOptions(),
    shape: getShapeOptions(),
    colorSchemes: {
      light: {
        palette: lightTheme.palette,
        baldin: lightTheme.baldin,
        components: lightTheme.components,
      },
      dark: {
        palette: darkTheme.palette,
        baldin: darkTheme.baldin,
        components: darkTheme.components,
      },
    } as never,
  });
}
