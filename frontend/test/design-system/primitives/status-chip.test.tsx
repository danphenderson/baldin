import React from 'react';
import { alpha } from '@mui/material/styles';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusChip } from '@/design-system';
import { createBaldinTheme } from '@/design-system/theme';

function renderStatusChip(node: React.ReactElement) {
  const theme = createBaldinTheme('dark');

  return {
    theme,
    ...render(
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {node}
      </MuiThemeProvider>,
    ),
  };
}

describe('StatusChip', () => {
  it('maps semantic tones to solid emphasis styles', () => {
    const { theme } = renderStatusChip(<StatusChip label="Ready" tone="warning" emphasis="solid" />);
    const chip = screen.getByText('Ready').closest('.MuiChip-root');

    expect(chip).toHaveStyle({
      backgroundColor: theme.palette.warning.main,
      color: theme.palette.getContrastText(theme.palette.warning.main),
    });
  });

  it('renders outline emphasis with semantic borders', () => {
    const { theme } = renderStatusChip(<StatusChip label="Queued" tone="primary" emphasis="outline" />);
    const chip = screen.getByText('Queued').closest('.MuiChip-root');

    expect(chip).toHaveStyle({
      color: theme.palette.primary.main,
    });
    expect(chip).toHaveStyle({
      borderColor: alpha(theme.palette.primary.main, 0.38),
    });
  });
});
