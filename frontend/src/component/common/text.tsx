import React from 'react';
import Typography, { type TypographyProps } from '@mui/material/Typography';
import { monoFontFamily, typographyRoles } from '../../design-system/tokens/typography';

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
  <Typography
    variant={typographyRoles.pageTitle.variant}
    fontWeight={typographyRoles.pageTitle.fontWeight}
    lineHeight={typographyRoles.pageTitle.lineHeight}
    {...props}
  />
);

/** Card / panel section heading (h6, 800, tight tracking). */
export const SectionTitle: React.FC<TextProps> = (props) => (
  <Typography
    variant={typographyRoles.sectionTitle.variant}
    fontWeight={typographyRoles.sectionTitle.fontWeight}
    lineHeight={typographyRoles.sectionTitle.lineHeight}
    letterSpacing={typographyRoles.sectionTitle.letterSpacing}
    {...props}
  />
);

/** Card title or list-row title (body1, 700). */
export const CardTitle: React.FC<TextProps> = (props) => (
  <Typography
    variant={typographyRoles.cardTitle.variant}
    fontWeight={typographyRoles.cardTitle.fontWeight}
    {...props}
  />
);

/** Secondary emphasis text — bold body (body2, 600). */
export const Label: React.FC<TextProps> = (props) => (
  <Typography
    variant={typographyRoles.label.variant}
    fontWeight={typographyRoles.label.fontWeight}
    {...props}
  />
);

/** Metadata, timestamps, secondary info (caption, text.secondary). */
export const Caption: React.FC<TextProps> = (props) => (
  <Typography
    variant={typographyRoles.caption.variant}
    color={typographyRoles.caption.color}
    lineHeight={typographyRoles.caption.lineHeight}
    {...props}
  />
);

/** Section-divider label — uppercased, spaced (overline). */
export const Overline: React.FC<TextProps> = (props) => (
  <Typography
    variant={typographyRoles.eyebrow.variant}
    color={typographyRoles.eyebrow.color}
    fontSize={typographyRoles.eyebrow.fontSize}
    letterSpacing={typographyRoles.eyebrow.letterSpacing}
    lineHeight={typographyRoles.eyebrow.lineHeight}
    {...props}
  />
);

/** Inline monospace for code, IDs, JSON keys. */
export const Mono: React.FC<TextProps> = (props) => (
  <Typography
    variant={typographyRoles.code.variant}
    fontFamily={monoFontFamily}
    fontSize={typographyRoles.code.fontSize}
    {...props}
  />
);
