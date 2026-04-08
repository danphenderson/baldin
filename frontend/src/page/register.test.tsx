import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from './register';
import * as authService from '../service/auth';

vi.mock('../service/auth', async () => {
  const actual = await vi.importActual<typeof import('../service/auth')>('../service/auth');
  return {
    ...actual,
    register: vi.fn(),
  };
});

const mockedRegister = vi.mocked(authService.register);

describe('RegisterPage', () => {
  beforeEach(() => {
    mockedRegister.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('blocks submission when the password does not satisfy the required rules', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/First name/i), { target: { value: 'Taylor' } });
    fireEvent.change(screen.getByLabelText(/Last name/i), { target: { value: 'Brooks' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'taylor@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'weak' } });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: 'weak' } });

    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('One uppercase letter')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Password does not meet the requirements below.')).toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();
  });
});
