import React from 'react';
import { render, screen } from '@testing-library/react';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UserContext } from '@/context/user-context';
import { createBaldinTheme } from '@/design-system/theme';
import LandingPage from '@/page/landing-page';

interface RenderLandingPageOptions {
  token?: string | null;
}

function renderLandingPage({ token = null }: RenderLandingPageOptions = {}) {
  const theme = createBaldinTheme('dark');

  return render(
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <UserContext.Provider
        value={{
          user: token ? ({ id: 'u1', first_name: 'Jane', email: 'jane@example.com' } as never) : null,
          setUser: vi.fn(),
          token,
          setToken: vi.fn(),
          loading: false,
          canAccessTier: vi.fn(() => true),
        }}
      >
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </UserContext.Provider>
    </MuiThemeProvider>,
  );
}

describe('LandingPage', () => {
  it('renders the marketing home with register and product sign-in CTAs for signed-out visitors', () => {
    renderLandingPage();

    expect(screen.getByRole('heading', { name: 'Run your job search like a system.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start the control plane' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: 'Sign in to product app' })).toHaveAttribute('href', '/login');
  });

  it('routes signed-in visitors from the marketing home to /dashboard', () => {
    renderLandingPage({ token: 'test-token' });

    expect(screen.getByRole('link', { name: 'Open product app' })).toHaveAttribute('href', '/dashboard');
  });
});
