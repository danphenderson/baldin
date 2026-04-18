import React from 'react';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Caption, CardTitle, Label, Mono, Overline, PageTitle, SectionTitle } from '@/design-system';
import { createBaldinTheme } from '@/design-system/theme';
import { monoFontFamily, typographyRoles } from '@/design-system/tokens/typography';

function renderTypography(node: React.ReactElement) {
  const theme = createBaldinTheme('dark');

  return render(
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {node}
    </MuiThemeProvider>,
  );
}

describe('Typography primitives', () => {
  it('applies the page-title role defaults', () => {
    renderTypography(<PageTitle data-testid="page-title">Dashboard</PageTitle>);

    expect(screen.getByTestId('page-title')).toHaveClass(`MuiTypography-${typographyRoles.pageTitle.variant}`);
    expect(screen.getByTestId('page-title')).toHaveStyle({
      fontWeight: `${typographyRoles.pageTitle.fontWeight}`,
      lineHeight: `${typographyRoles.pageTitle.lineHeight}`,
    });
  });

  it('applies mono and overline token styling', () => {
    renderTypography(
      <>
        <Mono data-testid="mono-token">console.log()</Mono>
        <Overline data-testid="overline-token">status</Overline>
      </>,
    );

    expect(screen.getByTestId('mono-token')).toHaveStyle({
      fontFamily: monoFontFamily,
      fontSize: typographyRoles.code.fontSize,
    });
    expect(screen.getByTestId('overline-token')).toHaveClass(`MuiTypography-${typographyRoles.eyebrow.variant}`);
    expect(screen.getByTestId('overline-token')).toHaveStyle({
      letterSpacing: typographyRoles.eyebrow.letterSpacing,
      lineHeight: `${typographyRoles.eyebrow.lineHeight}`,
    });
  });

  it('applies shared section, card, label, and caption role defaults', () => {
    renderTypography(
      <>
        <SectionTitle data-testid="section-title">Pipeline summary</SectionTitle>
        <CardTitle data-testid="card-title">Next action</CardTitle>
        <Label data-testid="label-token">Status</Label>
        <Caption data-testid="caption-token">Updated two minutes ago</Caption>
      </>,
    );

    expect(screen.getByTestId('section-title')).toHaveClass(`MuiTypography-${typographyRoles.sectionTitle.variant}`);
    expect(screen.getByTestId('section-title')).toHaveStyle({
      fontWeight: `${typographyRoles.sectionTitle.fontWeight}`,
      letterSpacing: typographyRoles.sectionTitle.letterSpacing,
      lineHeight: `${typographyRoles.sectionTitle.lineHeight}`,
    });
    expect(screen.getByTestId('card-title')).toHaveClass(`MuiTypography-${typographyRoles.cardTitle.variant}`);
    expect(screen.getByTestId('card-title')).toHaveStyle({
      fontWeight: `${typographyRoles.cardTitle.fontWeight}`,
    });
    expect(screen.getByTestId('label-token')).toHaveClass(`MuiTypography-${typographyRoles.label.variant}`);
    expect(screen.getByTestId('label-token')).toHaveStyle({
      fontWeight: `${typographyRoles.label.fontWeight}`,
    });
    expect(screen.getByTestId('caption-token')).toHaveClass(`MuiTypography-${typographyRoles.caption.variant}`);
    expect(screen.getByTestId('caption-token')).toHaveStyle({
      lineHeight: `${typographyRoles.caption.lineHeight}`,
    });
  });
});
