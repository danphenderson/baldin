export const fontFamilies = {
  body: '"Source Sans 3", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  display: '"Space Grotesk", "Source Sans 3", sans-serif',
  mono: '"JetBrains Mono", monospace',
} as const;

export const typographyRoles = {
  pageTitle: { variant: 'h5', fontWeight: 700, lineHeight: 1.2 },
  sectionTitle: { variant: 'h6', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' },
  cardTitle: { variant: 'body1', fontWeight: 700 },
  label: { variant: 'body2', fontWeight: 600 },
  caption: { variant: 'caption', color: 'text.secondary', lineHeight: 1.2 },
  eyebrow: {
    variant: 'overline',
    color: 'text.secondary',
    fontSize: '0.6875rem',
    letterSpacing: '0.08em',
    lineHeight: 1,
  },
  button: { fontFamily: fontFamilies.display, fontWeight: 600, letterSpacing: '0.02em' },
  code: { variant: 'body2', fontFamily: fontFamilies.mono, fontSize: '0.8125rem' },
} as const;

export const displayFontFamily = fontFamilies.display;
export const monoFontFamily = fontFamilies.mono;
