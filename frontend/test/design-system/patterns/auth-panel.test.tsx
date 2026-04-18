import React from 'react';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthPanel } from '@/design-system';
import { createBaldinTheme } from '@/design-system/theme';

function renderAuthPanel(node: React.ReactElement) {
  const theme = createBaldinTheme('dark');

  return render(
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {node}
    </MuiThemeProvider>,
  );
}

describe('AuthPanel', () => {
  it('renders the shared auth shell slots', () => {
    renderAuthPanel(
      <AuthPanel
        icon={<span data-testid="auth-panel-icon">I</span>}
        title="Welcome back"
        description="Sign in to continue"
        footer={<span>Need an account?</span>}
      >
        <button type="button">Continue</button>
      </AuthPanel>,
    );

    expect(screen.getByTestId('auth-panel-icon')).toBeInTheDocument();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    expect(screen.getByText('Need an account?')).toBeInTheDocument();
  });
});
