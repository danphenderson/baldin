import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import HomeLayout from '@/layout/home-layout';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div>page content</div>,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/component/common/footer', () => ({
  default: () => <footer>footer</footer>,
}));

describe('HomeLayout', () => {
  it('renders the Baldin brand CTA as a keyboard-accessible button', () => {
    render(
      <MemoryRouter initialEntries={['/user-terms']}>
        <HomeLayout />
      </MemoryRouter>,
    );

    const brandButton = screen.getByRole('button', { name: 'Go to Baldin home' });
    expect(brandButton).toBeInTheDocument();

    fireEvent.click(brandButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
