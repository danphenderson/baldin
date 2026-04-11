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
  findExistingApplicationForLead: vi.fn(),
  getApplicationStateLabel: vi.fn((application: { outcome?: string | null; stage?: string | null }) => (
    application.outcome ?? application.stage ?? 'tracked'
  )),
}));

vi.mock('../service/companies', () => ({
  getCompanies: vi.fn(),
}));

vi.mock('../component/lead-form-dialog', () => ({
  default: () => null,
}));

vi.mock('../component/lead-card', () => ({
  default: ({
    lead,
    onApply,
  }: {
    lead: { title?: string } & Record<string, unknown>;
    onApply: (lead: Record<string, unknown>, intent: 'registered' | 'applied') => void;
  }) => (
    <div data-testid="lead-card">
      <span>{lead.title ?? 'Untitled'}</span>
      <button onClick={() => onApply(lead, 'registered')}>
        Register interest for {lead.title ?? 'Untitled'}
      </button>
      <button onClick={() => onApply(lead, 'applied')}>
        Apply now for {lead.title ?? 'Untitled'}
      </button>
    </div>
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
import * as applicationsService from '../service/applications';
import * as companiesService from '../service/companies';
import LeadsPage from './leads';

const mockedGetLeads = vi.mocked(leadsService.getLeads);
const mockedGetCompanies = vi.mocked(companiesService.getCompanies);
const mockedCreateApplication = vi.mocked(applicationsService.createApplication);
const mockedFindExistingApplicationForLead = vi.mocked(applicationsService.findExistingApplicationForLead);

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
    mockedCreateApplication.mockReset();
    mockedFindExistingApplicationForLead.mockReset();
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
      items: [
        makeLead(),
        makeLead({ id: 'lead-2', title: 'Backend Engineer', location: 'NYC' }),
      ],
      total: 2,
      page: 1,
      page_size: 500,
    } as never);
    mockedGetCompanies.mockResolvedValue([] as never);

    renderPage();

    expect(await screen.findByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
  });

  it('renders the extraction bar', async () => {
    mockedGetLeads.mockResolvedValue({ items: [makeLead()], total: 1, page: 1, page_size: 500 } as never);
    mockedGetCompanies.mockResolvedValue([] as never);

    renderPage();

    await screen.findByText('Senior Frontend Engineer');

    expect(screen.getByTestId('extraction-bar')).toBeInTheDocument();
  });

  it('renders empty state when there are no leads', async () => {
    mockedGetLeads.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 500 } as never);
    mockedGetCompanies.mockResolvedValue([] as never);

    renderPage();

    expect(await screen.findByText('No leads imported yet')).toBeInTheDocument();
  });

  it('filters leads with the search bar', async () => {
    const user = userEvent.setup();

    mockedGetLeads.mockResolvedValue({
      items: [
        makeLead(),
        makeLead({ id: 'lead-2', title: 'Data Scientist', location: 'London' }),
      ],
      total: 2,
      page: 1,
      page_size: 500,
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

  it('creates a registered application when register interest is selected', async () => {
    const user = userEvent.setup();

    mockedGetLeads.mockResolvedValue({ items: [makeLead()], total: 1, page: 1, page_size: 500 } as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedFindExistingApplicationForLead.mockResolvedValue(null);
    mockedCreateApplication.mockResolvedValue({ id: 'app-1' } as never);

    renderPage();

    await screen.findByText('Senior Frontend Engineer');
    await user.click(screen.getByRole('button', { name: 'Register interest for Senior Frontend Engineer' }));

    await waitFor(() => {
      expect(mockedFindExistingApplicationForLead).toHaveBeenCalledWith('test-token', 'lead-1');
      expect(mockedCreateApplication).toHaveBeenCalledWith('test-token', {
        lead_id: 'lead-1',
        stage: 'registered',
      });
    });
  });

  it('warns before creating a duplicate application for the same lead', async () => {
    const user = userEvent.setup();

    mockedGetLeads.mockResolvedValue({ items: [makeLead()], total: 1, page: 1, page_size: 500 } as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedFindExistingApplicationForLead.mockResolvedValue({
      id: 'app-1',
      status: 'applied',
      stage: 'applied',
      outcome: null,
    } as never);

    renderPage();

    await screen.findByText('Senior Frontend Engineer');
    await user.click(screen.getByRole('button', { name: 'Apply now for Senior Frontend Engineer' }));

    expect(mockedCreateApplication).not.toHaveBeenCalled();
    expect(await screen.findByText('"Senior Frontend Engineer" already exists in your applications as applied.')).toBeInTheDocument();
  });
});
