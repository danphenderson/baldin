export const fontFamilies = {
  body: '"Source Sans 3", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  display: '"Space Grotesk", "Source Sans 3", sans-serif',
  mono: '"JetBrains Mono", monospace',
} as const;

export const typographyRoles = {
  pageTitle: { variant: 'h4', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em' },
  sectionTitle: { variant: 'h6', fontWeight: 700, lineHeight: 1.18, letterSpacing: '-0.02em' },
  cardTitle: { variant: 'body1', fontWeight: 700 },
  label: { variant: 'body2', fontWeight: 600 },
  caption: { variant: 'caption', color: 'text.secondary', lineHeight: 1.35 },
  eyebrow: {
    variant: 'overline',
    color: 'text.secondary',
    fontSize: '0.7rem',
    letterSpacing: '0.06em',
    lineHeight: 1.1,
  },
  button: { fontFamily: fontFamilies.display, fontWeight: 600, letterSpacing: '0.01em' },
  code: { variant: 'body2', fontFamily: fontFamilies.mono, fontSize: '0.8125rem' },
} as const;

export const displayFontFamily = fontFamilies.display;
export const monoFontFamily = fontFamilies.mono;
