import type { ThemeOptions } from '@mui/material/styles';
import { fontFamilies } from '../tokens/typography';

export function getTypographyOptions(): ThemeOptions['typography'] {
  return {
    fontFamily: fontFamilies.body,
    h1: { fontFamily: fontFamilies.display, fontWeight: 700, letterSpacing: '-0.03em' },
    h2: { fontFamily: fontFamilies.display, fontWeight: 700, letterSpacing: '-0.03em' },
    h3: { fontFamily: fontFamilies.display, fontWeight: 700, letterSpacing: '-0.025em' },
    h4: { fontFamily: fontFamilies.display, fontWeight: 600 },
    h5: { fontFamily: fontFamilies.display, fontWeight: 600 },
    h6: { fontFamily: fontFamilies.display, fontWeight: 600 },
    subtitle2: {
      fontFamily: fontFamilies.display,
      fontWeight: 500,
      fontSize: '0.8rem',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
    button: {
      fontFamily: fontFamilies.display,
      fontWeight: 600,
      letterSpacing: '0.02em',
      textTransform: 'none',
    },
  };
}
