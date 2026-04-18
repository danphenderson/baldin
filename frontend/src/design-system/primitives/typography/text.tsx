import React from 'react';
import Typography, { type TypographyProps } from '@mui/material/Typography';
import { monoFontFamily, typographyRoles } from '../../tokens/typography';

type TextProps = Omit<TypographyProps, 'variant'>;

export const PageTitle: React.FC<TextProps> = (props) => (
  <Typography
    variant={typographyRoles.pageTitle.variant}
    fontWeight={typographyRoles.pageTitle.fontWeight}
    lineHeight={typographyRoles.pageTitle.lineHeight}
    {...props}
  />
);

export const SectionTitle: React.FC<TextProps> = (props) => (
  <Typography
    variant={typographyRoles.sectionTitle.variant}
    fontWeight={typographyRoles.sectionTitle.fontWeight}
    lineHeight={typographyRoles.sectionTitle.lineHeight}
    letterSpacing={typographyRoles.sectionTitle.letterSpacing}
    {...props}
  />
);

export const CardTitle: React.FC<TextProps> = (props) => (
  <Typography
    variant={typographyRoles.cardTitle.variant}
    fontWeight={typographyRoles.cardTitle.fontWeight}
    {...props}
  />
);

export const Label: React.FC<TextProps> = (props) => (
  <Typography
    variant={typographyRoles.label.variant}
    fontWeight={typographyRoles.label.fontWeight}
    {...props}
  />
);

export const Caption: React.FC<TextProps> = (props) => (
  <Typography
    variant={typographyRoles.caption.variant}
    color={typographyRoles.caption.color}
    lineHeight={typographyRoles.caption.lineHeight}
    {...props}
  />
);

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

export const Mono: React.FC<TextProps> = (props) => (
  <Typography
    variant={typographyRoles.code.variant}
    fontFamily={monoFontFamily}
    fontSize={typographyRoles.code.fontSize}
    {...props}
  />
);
