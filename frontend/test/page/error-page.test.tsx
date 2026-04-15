import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UserContext } from '@/context/user-context';
import { createBaldinTheme } from '@/design-system/theme';
import ErrorPage from '@/page/error';

interface RenderErrorPageOptions {
  token?: string | null;
}

function renderErrorPage({ token = null }: RenderErrorPageOptions = {}) {
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
        <MemoryRouter initialEntries={['/missing']}>
          <Routes>
            <Route path="/missing" element={<ErrorPage />} />
            <Route path="/login" element={<div data-testid="page-login">Login</div>} />
            <Route path="/dashboard" element={<div data-testid="page-dashboard">Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </UserContext.Provider>
    </MuiThemeProvider>,
  );
}

describe('ErrorPage', () => {
  it('sends signed-out visitors to /login from the 404 recovery CTA', async () => {
    const user = userEvent.setup();

    renderErrorPage();

    expect(screen.getByRole('button', { name: 'Sign in to the product app' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign in to the product app' }));

    expect(await screen.findByTestId('page-login')).toBeInTheDocument();
  });

  it('returns signed-in visitors to /dashboard from the 404 recovery CTA', async () => {
    const user = userEvent.setup();

    renderErrorPage({ token: 'test-token' });

    expect(screen.getByRole('button', { name: 'Go back to dashboard' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Go back to dashboard' }));

    expect(await screen.findByTestId('page-dashboard')).toBeInTheDocument();
  });
});
