import type {
  alphaTokens,
  BorderTokens,
  fontFamilies,
  motionTokens,
  radiusTokens,
  StateTokens,
  StatusTokens,
  SurfaceTokens,
} from '../tokens';
import type { ElevationTokens } from '../tokens/elevation';

declare module '@mui/material/styles' {
  interface Theme {
    baldin: {
      status: StatusTokens;
      alpha: typeof alphaTokens;
      radius: typeof radiusTokens;
      elevation: ElevationTokens;
      motion: typeof motionTokens;
      fontFamily: typeof fontFamilies;
      surface: SurfaceTokens;
      border: BorderTokens;
      state: StateTokens;
    };
  }

  interface ThemeOptions {
    baldin?: Partial<Theme['baldin']>;
  }
}
