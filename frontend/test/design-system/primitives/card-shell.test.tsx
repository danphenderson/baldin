import React from 'react';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CardShell } from '@/design-system';
import { createBaldinTheme } from '@/design-system/theme';

function renderCardShell(node: React.ReactElement) {
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

describe('CardShell', () => {
  it('activates on keyboard when interactive', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    renderCardShell(
      <CardShell interactive onClick={onClick} tone="primary">
        <span>Open card</span>
      </CardShell>,
    );

    const card = screen.getByRole('button');
    card.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('uses compact density spacing and raised surface by default', () => {
    const { theme } = renderCardShell(
      <CardShell density="compact" tone="info" data-testid="card-shell">
        <span>Density check</span>
      </CardShell>,
    );

    expect(screen.getByText('Density check').parentElement).toHaveStyle({
      padding: '20px',
    });
    expect(screen.getByTestId('card-shell')).toHaveStyle({
      borderRadius: '12px',
    });
  });
});
