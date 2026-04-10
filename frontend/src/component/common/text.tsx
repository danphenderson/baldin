import React from 'react';
import Typography, { type TypographyProps } from '@mui/material/Typography';

/* ------------------------------------------------------------------ */
/*  Text primitives                                                    */
/*                                                                     */
/*  Thin wrappers around MUI Typography that bake in the variant,      */
/*  weight, and spacing the design system intends.  Consumers pass     */
/*  `sx` for margin / color overrides only — not font properties.      */
/* ------------------------------------------------------------------ */

type TextProps = Omit<TypographyProps, 'variant'>;

/** Primary page heading (h5, 700). */
export const PageTitle: React.FC<TextProps> = (props) => (
  <Typography variant="h5" fontWeight={700} lineHeight={1.2} {...props} />
);

/** Card / panel section heading (h6, 800, tight tracking). */
export const SectionTitle: React.FC<TextProps> = (props) => (
  <Typography
    variant="h6"
    fontWeight={800}
    lineHeight={1.1}
    letterSpacing="-0.02em"
    {...props}
  />
);

/** Card title or list-row title (body1, 700). */
export const CardTitle: React.FC<TextProps> = (props) => (
  <Typography variant="body1" fontWeight={700} {...props} />
);

/** Secondary emphasis text — bold body (body2, 600). */
export const Label: React.FC<TextProps> = (props) => (
  <Typography variant="body2" fontWeight={600} {...props} />
);

/** Metadata, timestamps, secondary info (caption, text.secondary). */
export const Caption: React.FC<TextProps> = (props) => (
  <Typography variant="caption" color="text.secondary" lineHeight={1.2} {...props} />
);

/** Section-divider label — uppercased, spaced (overline). */
export const Overline: React.FC<TextProps> = (props) => (
  <Typography
    variant="overline"
    color="text.secondary"
    fontSize="0.6875rem"
    letterSpacing="0.08em"
    lineHeight={1}
    {...props}
  />
);

/** Inline monospace for code, IDs, JSON keys. */
export const Mono: React.FC<TextProps> = (props) => (
  <Typography
    variant="body2"
    fontFamily="'JetBrains Mono', monospace"
    fontSize="0.8125rem"
    {...props}
  />
);
