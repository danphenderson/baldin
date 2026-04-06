import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UserContext } from '../context/user-context';
import { NotificationProvider } from '../context/notification-context';
import { ToolbarHeaderContext } from '../layout/toolbar-header-context';

/* ── Mock service modules ─────────────────────────────────────────── */

vi.mock('../service/leads', () => ({
  getLeads: vi.fn(),
  createLead: vi.fn(),
  updateLead: vi.fn(),
  deleteLead: vi.fn(),
  extractLead: vi.fn(),
}));

vi.mock('../service/applications', () => ({
  createApplication: vi.fn(),
}));

vi.mock('../service/companies', () => ({
  getCompanies: vi.fn(),
}));

vi.mock('../component/lead-form-dialog', () => ({
  default: () => null,
}));

vi.mock('../component/lead-card', () => ({
  default: ({ lead }: { lead: { title?: string } }) => (
    <div data-testid="lead-card">{lead.title ?? 'Untitled'}</div>
  ),
}));

vi.mock('../component/lead-modal', () => ({
  default: () => null,
}));

vi.mock('../component/lead-extraction-bar', () => ({
  default: ({ url, onUrlChange, onExtract }: {
    url: string;
    onUrlChange: (v: string) => void;
    onExtract: () => void;
  }) => (
    <div data-testid="extraction-bar">
      <input
        aria-label="Extraction URL"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
      />
      <button onClick={onExtract}>Extract</button>
    </div>
  ),
}));

vi.mock('../component/lead-search-bar', () => ({
  default: ({ search, onSearchChange }: {
    search: string;
    onSearchChange: (v: string) => void;
  }) => (
    <input
      aria-label="Search leads"
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
    />
  ),
}));

vi.mock('../component/common/confirm-dialog', () => ({
  default: () => null,
}));

vi.mock('../component/common/empty-state', () => ({
  default: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      {description && <span>{description}</span>}
    </div>
  ),
}));

import * as leadsService from '../service/leads';
import * as companiesService from '../service/companies';
import LeadsPage from './leads';

const mockedGetLeads = vi.mocked(leadsService.getLeads);
const mockedGetCompanies = vi.mocked(companiesService.getCompanies);

/* ── Test data ────────────────────────────────────────────────────── */

function makeLead(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'lead-1',
    title: 'Senior Frontend Engineer',
    description: 'Build awesome UIs',
    location: 'Remote, US',
    employment_type: 'Full-time',
    salary: '$150k–$200k',
    viewer_is_registered: true,
    interest_count: 3,
    comment_count: 1,
    companies: [{ id: 'c-1', name: 'Acme Corp' }],
    created_at: '2026-04-01T00:00:00',
    updated_at: '2026-04-01T00:00:00',
    ...overrides,
  };
}

/* ── Helpers ──────────────────────────────────────────────────────── */

const userContextValue = {
  user: { id: 'u1', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com' } as never,
  setUser: vi.fn(),
  token: 'test-token',
  setToken: vi.fn(),
  loading: false,
  canAccessTier: vi.fn(() => true),
};

function renderPage() {
  return render(
    <ToolbarHeaderContext.Provider value={vi.fn()}>
      <UserContext.Provider value={userContextValue}>
        <NotificationProvider>
          <MemoryRouter>
            <LeadsPage />
          </MemoryRouter>
        </NotificationProvider>
      </UserContext.Provider>
    </ToolbarHeaderContext.Provider>,
  );
}

/* ── Tests ────────────────────────────────────────────────────────── */

describe('LeadsPage', () => {
  beforeEach(() => {
    mockedGetLeads.mockReset();
    mockedGetCompanies.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons while data is being fetched', () => {
    mockedGetLeads.mockReturnValue(new Promise(() => {}));
    mockedGetCompanies.mockReturnValue(new Promise(() => {}));

    renderPage();

    // MUI Skeleton elements render during loading
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders lead list when data loads', async () => {
    mockedGetLeads.mockResolvedValue({
      leads: [
        makeLead(),
        makeLead({ id: 'lead-2', title: 'Backend Engineer', location: 'NYC' }),
      ],
      pagination: { page: 1, page_size: 500 },
    } as never);
    mockedGetCompanies.mockResolvedValue([] as never);

    renderPage();

    expect(await screen.findByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
  });

  it('renders the extraction bar', async () => {
    mockedGetLeads.mockResolvedValue({ leads: [makeLead()], pagination: {} } as never);
    mockedGetCompanies.mockResolvedValue([] as never);

    renderPage();

    await screen.findByText('Senior Frontend Engineer');

    expect(screen.getByTestId('extraction-bar')).toBeInTheDocument();
  });

  it('renders empty state when there are no leads', async () => {
    mockedGetLeads.mockResolvedValue({ leads: [], pagination: {} } as never);
    mockedGetCompanies.mockResolvedValue([] as never);

    renderPage();

    expect(await screen.findByText('No leads imported yet')).toBeInTheDocument();
  });

  it('filters leads with the search bar', async () => {
    const user = userEvent.setup();

    mockedGetLeads.mockResolvedValue({
      leads: [
        makeLead(),
        makeLead({ id: 'lead-2', title: 'Data Scientist', location: 'London' }),
      ],
      pagination: {},
    } as never);
    mockedGetCompanies.mockResolvedValue([] as never);

    renderPage();

    // Wait for cards to appear
    expect(await screen.findByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Data Scientist')).toBeInTheDocument();

    // Type in search
    const searchInput = screen.getByLabelText('Search leads');
    await user.type(searchInput, 'Data');

    // The non-matching lead should disappear
    await waitFor(() => {
      expect(screen.queryByText('Senior Frontend Engineer')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Data Scientist')).toBeInTheDocument();
  });
});
