import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UserContext } from '@/context/user-context';
import LoginPage from '@/page/login';
import * as authService from '@/service/auth';

vi.mock('@/service/auth', async () => {
  const actual = await vi.importActual<typeof import('@/service/auth')>('@/service/auth');
  return {
    ...actual,
    login: vi.fn(),
    mfaLoginVerify: vi.fn(),
  };
});

const mockedLogin = vi.mocked(authService.login);
const mockedMfaLoginVerify = vi.mocked(authService.mfaLoginVerify);

function renderLoginPage(setToken = vi.fn()) {
  render(
    <UserContext.Provider
      value={{
        user: null,
        setUser: vi.fn(),
        token: null,
        setToken,
        loading: false,
        canAccessTier: vi.fn(() => true),
      }}
    >
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </UserContext.Provider>,
  );

  return { setToken };
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockedLogin.mockReset();
    mockedMfaLoginVerify.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the MFA verification step when login returns a challenge', async () => {
    mockedLogin.mockResolvedValue({ mfa_required: true, mfa_token: 'challenge-token' });
    mockedMfaLoginVerify.mockResolvedValue('verified-access-token');

    const { setToken } = renderLoginPage();

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i, { selector: 'input' }), { target: { value: 'Password1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Two-Factor Authentication')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Verification code/i), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() => {
      expect(mockedMfaLoginVerify).toHaveBeenCalledWith('challenge-token', '123456');
    });
    expect(setToken).toHaveBeenCalledWith('verified-access-token');
  });

  it('labels the password visibility toggle for assistive technology', () => {
    renderLoginPage();

    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));

    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
  });
});
