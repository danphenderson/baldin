import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UserContext } from '@/context/user-context';
import AdminRoutes from '@/admin/admin-routes';

vi.mock('@/page/login', () => ({
  default: ({ footer }: { footer?: React.ReactNode }) => (
    <div data-testid="page-login">
      Admin Login
      {footer ? <div data-testid="page-login-footer">{footer}</div> : null}
    </div>
  ),
}));

vi.mock('@/page/db-management', () => ({
  default: () => <div data-testid="page-db-management">DB Management</div>,
}));

vi.mock('@/page/review-queue', () => ({
  default: () => <div data-testid="page-review">Review Queue</div>,
}));

vi.mock('@/page/crawlers', () => ({
  default: () => <div data-testid="page-crawlers">Crawlers</div>,
}));

interface RenderAdminRoutesOptions {
  initialPath: string;
  loading?: boolean;
  token?: string | null;
  isSuperuser?: boolean;
  userLoaded?: boolean;
}

function renderAdminRoutes({
  initialPath,
  isSuperuser = false,
  loading = false,
  token = 'test-token',
  userLoaded = true,
}: RenderAdminRoutesOptions) {
  const setToken = vi.fn();
  const setUser = vi.fn();

  render(
    <UserContext.Provider
      value={{
        user: token && userLoaded
          ? ({ id: 'admin-1', first_name: 'Jane', email: 'jane@example.com', is_superuser: isSuperuser } as never)
          : null,
        setUser,
        token,
        setToken,
        loading,
        canAccessTier: vi.fn(() => true),
      }}
    >
      <MemoryRouter initialEntries={[initialPath]}>
        <AdminRoutes />
      </MemoryRouter>
    </UserContext.Provider>,
  );

  return { setToken, setUser };
}

describe('AdminRoutes', () => {
  it('redirects logged-out visitors to /admin/login when they open a protected admin route', async () => {
    renderAdminRoutes({ initialPath: '/db-management', token: null });

    expect(await screen.findByTestId('page-login')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in to the product app' })).toHaveAttribute('href', '/login');
  });

  it('keeps the admin root in a loading state while the authenticated user profile is still resolving', () => {
    renderAdminRoutes({ initialPath: '/', userLoaded: false });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('page-login')).not.toBeInTheDocument();
  });

  it('keeps /admin/login in a loading state while the authenticated user profile is still resolving', () => {
    renderAdminRoutes({ initialPath: '/login', userLoaded: false });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('page-login')).not.toBeInTheDocument();
  });

  it('renders db-management for authenticated superusers', async () => {
    renderAdminRoutes({ initialPath: '/db-management', isSuperuser: true });

    expect(await screen.findByTestId('page-db-management')).toBeInTheDocument();
  });

  it('renders review queue for authenticated superusers', async () => {
    renderAdminRoutes({ initialPath: '/review', isSuperuser: true });

    expect(await screen.findByTestId('page-review')).toBeInTheDocument();
  });

  it('renders crawlers for authenticated superusers', async () => {
    renderAdminRoutes({ initialPath: '/crawlers', isSuperuser: true });

    expect(await screen.findByTestId('page-crawlers')).toBeInTheDocument();
  });

  it('shows access denied and clears the admin session for non-superusers', async () => {
    const { setToken, setUser } = renderAdminRoutes({ initialPath: '/review', isSuperuser: false });

    expect(await screen.findByText('Admin access denied')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in to product app' })).toHaveAttribute('href', '/login');
    await waitFor(() => {
      expect(setToken).toHaveBeenCalledWith(null);
      expect(setUser).toHaveBeenCalledWith(null);
    });
  });
});
