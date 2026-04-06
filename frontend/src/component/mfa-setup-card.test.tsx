import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserContext } from '../context/user-context';
import MFASetupCard from './mfa-setup-card';
import * as authService from '../service/auth';

vi.mock('../service/auth', async () => {
  const actual = await vi.importActual<typeof import('../service/auth')>('../service/auth');
  return {
    ...actual,
    mfaStatus: vi.fn(),
    mfaSetup: vi.fn(),
    mfaVerify: vi.fn(),
    mfaDisable: vi.fn(),
  };
});

const mockedMfaStatus = vi.mocked(authService.mfaStatus);
const mockedMfaSetup = vi.mocked(authService.mfaSetup);

function renderCard(token: string | null = 'token-123') {
  render(
    <UserContext.Provider
      value={{
        user: null,
        setUser: vi.fn(),
        token,
        setToken: vi.fn(),
        loading: false,
        canAccessTier: vi.fn(() => true),
      }}
    >
      <MFASetupCard />
    </UserContext.Provider>,
  );
}

describe('MFASetupCard', () => {
  beforeEach(() => {
    mockedMfaStatus.mockReset();
    mockedMfaSetup.mockReset();
    mockedMfaStatus.mockResolvedValue(false);
    mockedMfaSetup.mockResolvedValue({
      secret: 'JBSWY3DPEHPK3PXP',
      provisioning_uri: 'otpauth://totp/Baldin:test@example.com',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requires an explicit recovery warning acknowledgement before setup starts', async () => {
    renderCard();

    expect(await screen.findByText('Disabled')).toBeInTheDocument();
    expect(
      screen.getByText(/a Baldin superuser must reset MFA before you can sign in again/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch'));

    expect(
      await screen.findByText('Before you enable two-factor authentication'),
    ).toBeInTheDocument();
    expect(mockedMfaSetup).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(mockedMfaSetup).toHaveBeenCalledWith('token-123');
    });
  });

  it('renders without a loading spinner when no token is available yet', async () => {
    renderCard(null);

    expect(await screen.findByText('Disabled')).toBeInTheDocument();
    expect(mockedMfaStatus).not.toHaveBeenCalled();
  });
});
