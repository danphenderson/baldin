import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UserContext } from '../context/user-context';
import { ToolbarHeaderContext } from '../layout/toolbar-header-context';
import AppRoutes from './app-routes';

/* ── Mock all lazy page imports to lightweight stubs ───────────────── */

vi.mock('../page/dashboard', () => ({
  default: () => <div data-testid="page-dashboard">Dashboard</div>,
}));
vi.mock('../page/leads', () => ({
  default: () => <div data-testid="page-leads">Leads</div>,
}));
vi.mock('../page/companies', () => ({
  default: () => <div data-testid="page-companies">Companies</div>,
}));
vi.mock('../page/applications/applications-queue-page', () => ({
  default: () => <div data-testid="page-applications">Applications</div>,
}));
vi.mock('../page/applications/applications-board-page', () => ({
  default: () => <div data-testid="page-board">Board</div>,
}));
vi.mock('../page/applications/applications-detail-page', () => ({
  default: () => <div data-testid="page-app-detail">AppDetail</div>,
}));
vi.mock('../page/documents/document-list', () => ({
  default: () => <div data-testid="page-documents">Documents</div>,
}));
vi.mock('../page/documents/document-detail', () => ({
  default: () => <div data-testid="page-doc-detail">DocDetail</div>,
}));
vi.mock('../page/documents/document-editor', () => ({
  default: () => <div data-testid="page-doc-editor">DocEditor</div>,
}));
vi.mock('../page/documents/document-compare', () => ({
  default: () => <div data-testid="page-doc-compare">DocCompare</div>,
}));
vi.mock('../page/profile/index', () => ({
  default: () => <div data-testid="page-profile">Profile</div>,
}));
vi.mock('../page/pipelines', () => ({
  default: () => <div data-testid="page-pipelines">Pipelines</div>,
}));
vi.mock('../page/extractor', () => ({
  default: () => <div data-testid="page-extractor">Extractor</div>,
}));
vi.mock('../page/directory', () => ({
  default: () => <div data-testid="page-directory">Directory</div>,
}));
vi.mock('../page/user-profile', () => ({
  default: () => <div data-testid="page-user-profile">UserProfile</div>,
}));
vi.mock('../page/connections', () => ({
  default: () => <div data-testid="page-connections">Connections</div>,
}));
vi.mock('../page/messages/conversations-page', () => ({
  default: () => <div data-testid="page-conversations">Conversations</div>,
}));
vi.mock('../page/messages/conversation-detail-page', () => ({
  default: () => <div data-testid="page-conversation-detail">ConversationDetail</div>,
}));
vi.mock('../page/settings/account-page', () => ({
  default: () => <div data-testid="page-settings">Settings</div>,
}));
vi.mock('../page/crawlers', () => ({
  default: () => <div data-testid="page-crawlers">Crawlers</div>,
}));
vi.mock('../page/review-queue', () => ({
  default: () => <div data-testid="page-review">Review</div>,
}));
vi.mock('../page/login', () => ({
  default: () => <div data-testid="page-login">Login</div>,
}));
vi.mock('../page/register', () => ({
  default: () => <div data-testid="page-register">Register</div>,
}));
vi.mock('../page/user-terms', () => ({
  default: () => <div data-testid="page-user-terms">UserTerms</div>,
}));
vi.mock('../page/error', () => ({
  default: () => <div data-testid="page-error">404</div>,
}));

/* ── Mock layout components to pass-through ───────────────────────── */

vi.mock('../layout/app-layout', () => ({
  default: () => {
    const { Outlet } = require('react-router-dom');
    return <Outlet />;
  },
}));
vi.mock('../layout/auth-layout', () => ({
  default: () => {
    const { Outlet } = require('react-router-dom');
    return <Outlet />;
  },
}));
vi.mock('../layout/home-layout', () => ({
  default: () => {
    const { Outlet } = require('react-router-dom');
    return <Outlet />;
  },
}));
vi.mock('../layout/leads-group-layout', () => ({
  default: () => {
    const { Outlet } = require('react-router-dom');
    return <Outlet />;
  },
}));
vi.mock('../layout/identity-group-layout', () => ({
  default: () => {
    const { Outlet } = require('react-router-dom');
    return <Outlet />;
  },
}));
vi.mock('../layout/applications-group-layout', () => ({
  default: () => {
    const { Outlet } = require('react-router-dom');
    return <Outlet />;
  },
}));
vi.mock('../layout/documents-group-layout', () => ({
  default: () => {
    const { Outlet } = require('react-router-dom');
    return <Outlet />;
  },
}));
vi.mock('../layout/workflows-group-layout', () => ({
  default: () => {
    const { Outlet } = require('react-router-dom');
    return <Outlet />;
  },
}));
vi.mock('../layout/network-group-layout', () => ({
  default: () => {
    const { Outlet } = require('react-router-dom');
    return <Outlet />;
  },
}));
vi.mock('../layout/settings-group-layout', () => ({
  default: () => {
    const { Outlet } = require('react-router-dom');
    return <Outlet />;
  },
}));

/* ── Helpers ──────────────────────────────────────────────────────── */

function renderRoutes(
  initialPath: string,
  auth: { token: string | null; loading: boolean } = { token: 'test-token', loading: false },
) {
  return render(
    <ToolbarHeaderContext.Provider value={vi.fn()}>
      <UserContext.Provider
        value={{
          user: auth.token
            ? ({ id: 'u1', first_name: 'Jane', is_superuser: false } as never)
            : null,
          setUser: vi.fn(),
          token: auth.token,
          setToken: vi.fn(),
          loading: auth.loading,
          canAccessTier: vi.fn(() => true),
        }}
      >
        <MemoryRouter initialEntries={[initialPath]}>
          <AppRoutes />
        </MemoryRouter>
      </UserContext.Provider>
    </ToolbarHeaderContext.Provider>,
  );
}

/* ── Tests ────────────────────────────────────────────────────────── */

describe('AppRoutes', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  /* ── Public routes ── */

  it('renders login page for /login without authentication', async () => {
    renderRoutes('/login', { token: null, loading: false });
    expect(await screen.findByTestId('page-login')).toBeInTheDocument();
  });

  it('renders register page for /register without authentication', async () => {
    renderRoutes('/register', { token: null, loading: false });
    expect(await screen.findByTestId('page-register')).toBeInTheDocument();
  });

  it('renders user-terms page for /user-terms', async () => {
    renderRoutes('/user-terms', { token: null, loading: false });
    expect(await screen.findByTestId('page-user-terms')).toBeInTheDocument();
  });

  /* ── Protected routes redirect unauthenticated users ── */

  it('redirects to /login when visiting / without auth', async () => {
    renderRoutes('/', { token: null, loading: false });
    expect(await screen.findByTestId('page-login')).toBeInTheDocument();
  });

  it('redirects to /login when visiting /leads without auth', async () => {
    renderRoutes('/leads', { token: null, loading: false });
    expect(await screen.findByTestId('page-login')).toBeInTheDocument();
  });

  it('redirects to /login when visiting /applications without auth', async () => {
    renderRoutes('/applications', { token: null, loading: false });
    expect(await screen.findByTestId('page-login')).toBeInTheDocument();
  });

  /* ── Authenticated user sees protected routes ── */

  it('renders dashboard for / when authenticated', async () => {
    renderRoutes('/');
    expect(await screen.findByTestId('page-dashboard')).toBeInTheDocument();
  });

  it('renders leads page for /leads when authenticated', async () => {
    renderRoutes('/leads');
    expect(await screen.findByTestId('page-leads')).toBeInTheDocument();
  });

  it('renders applications page for /applications when authenticated', async () => {
    renderRoutes('/applications');
    expect(await screen.findByTestId('page-applications')).toBeInTheDocument();
  });

  /* ── Legacy redirects ── */

  it('redirects /companies to /leads/companies', async () => {
    renderRoutes('/companies');
    expect(await screen.findByTestId('page-companies')).toBeInTheDocument();
  });

  it('redirects /profile to /me (profile page)', async () => {
    renderRoutes('/profile');
    expect(await screen.findByTestId('page-profile')).toBeInTheDocument();
  });

  it('redirects /pipelines to /workflows', async () => {
    renderRoutes('/pipelines');
    expect(await screen.findByTestId('page-pipelines')).toBeInTheDocument();
  });

  it('redirects /data-orchestration to /workflows', async () => {
    renderRoutes('/data-orchestration');
    expect(await screen.findByTestId('page-pipelines')).toBeInTheDocument();
  });

  it('redirects /extractor to /workflows/extractors', async () => {
    renderRoutes('/extractor');
    expect(await screen.findByTestId('page-extractor')).toBeInTheDocument();
  });

  /* ── 404 fallback ── */

  it('renders 404 page for unknown routes', async () => {
    renderRoutes('/some/unknown/route');
    expect(await screen.findByTestId('page-error')).toBeInTheDocument();
  });
});
