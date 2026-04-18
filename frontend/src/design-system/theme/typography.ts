import type { ThemeOptions } from '@mui/material/styles';
import { fontFamilies } from '../tokens/typography';

export function getTypographyOptions(): ThemeOptions['typography'] {
  return {
    fontFamily: fontFamilies.body,
    h1: { fontFamily: fontFamilies.display, fontWeight: 700, fontSize: '3rem', lineHeight: 1.02, letterSpacing: '-0.045em' },
    h2: { fontFamily: fontFamilies.display, fontWeight: 700, fontSize: '2.4rem', lineHeight: 1.05, letterSpacing: '-0.04em' },
    h3: { fontFamily: fontFamilies.display, fontWeight: 700, fontSize: '2rem', lineHeight: 1.08, letterSpacing: '-0.035em' },
    h4: { fontFamily: fontFamilies.display, fontWeight: 700, fontSize: '1.6rem', lineHeight: 1.12, letterSpacing: '-0.03em' },
    h5: { fontFamily: fontFamilies.display, fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.18, letterSpacing: '-0.02em' },
    h6: { fontFamily: fontFamilies.display, fontWeight: 700, fontSize: '1rem', lineHeight: 1.24, letterSpacing: '-0.015em' },
    subtitle1: {
      fontFamily: fontFamilies.body,
      fontWeight: 600,
      fontSize: '0.95rem',
      lineHeight: 1.35,
    },
    subtitle2: {
      fontFamily: fontFamilies.display,
      fontWeight: 600,
      fontSize: '0.75rem',
      letterSpacing: '0.045em',
      textTransform: 'uppercase',
    },
    body1: {
      fontSize: '0.95rem',
      lineHeight: 1.55,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.55,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
    },
    overline: {
      fontSize: '0.7rem',
      lineHeight: 1.2,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    },
    button: {
      fontFamily: fontFamilies.display,
      fontWeight: 600,
      letterSpacing: '0.01em',
      textTransform: 'none',
    },
  };
}
