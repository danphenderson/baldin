import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UserContext } from '@/context/user-context';
import { NotificationProvider } from '@/context/notification-context';
import { ToolbarHeaderContext } from '@/layout/toolbar-header-context';

/* ── Mock service modules ─────────────────────────────────────────── */

vi.mock('@/service/leads', () => ({
  MAX_ASPIRATION_MATCH_LEADS: 20,
  getLeads: vi.fn(),
  createLead: vi.fn(),
  updateLead: vi.fn(),
  deleteLead: vi.fn(),
  extractLead: vi.fn(),
  rankLeads: vi.fn(),
}));

vi.mock('@/service/applications', () => ({
  createApplication: vi.fn(),
  findExistingApplicationForLead: vi.fn(),
  getApplicationStateLabel: vi.fn((application: { outcome?: string | null; stage?: string | null }) => (
    application.outcome ?? application.stage ?? 'tracked'
  )),
}));

vi.mock('@/service/companies', () => ({
  getCompanies: vi.fn(),
}));

vi.mock('@/service/aspirations', () => ({
  getAspirations: vi.fn(),
}));

vi.mock('@/component/lead-form-dialog', () => ({
  default: () => null,
}));

vi.mock('@/component/lead-card', () => ({
  default: ({
    lead,
    ranking,
    onApply,
  }: {
    lead: { title?: string } & Record<string, unknown>;
    ranking?: { relevanceScore: number } | null;
    onApply: (lead: Record<string, unknown>, intent: 'registered' | 'applied') => void;
  }) => (
    <div data-testid="lead-card">
      <span>{lead.title ?? 'Untitled'}</span>
      {ranking && <span>{`Aspiration fit ${ranking.relevanceScore}/10`}</span>}
      <button onClick={() => onApply(lead, 'registered')}>
        Register interest for {lead.title ?? 'Untitled'}
      </button>
      <button onClick={() => onApply(lead, 'applied')}>
        Apply now for {lead.title ?? 'Untitled'}
      </button>
    </div>
  ),
}));

vi.mock('@/component/lead-modal', () => ({
  default: () => null,
}));

vi.mock('@/component/lead-extraction-bar', () => ({
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

vi.mock('@/component/lead-search-bar', () => ({
  default: ({ search, rankingActive, rankingPending, rankingDisabledReason, onSearchChange, onRank, onClearRanking }: {
    search: string;
    rankingActive?: boolean;
    rankingPending?: boolean;
    rankingDisabledReason?: string;
    onSearchChange: (v: string) => void;
    onRank: () => void;
    onClearRanking: () => void;
  }) => (
    <div>
      <input
        aria-label="Search leads"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <button onClick={onRank} disabled={Boolean(rankingDisabledReason) || rankingPending}>
        Rank with aspirations
      </button>
      {rankingDisabledReason && <span>{rankingDisabledReason}</span>}
      {rankingActive && (
        <button onClick={onClearRanking}>Clear ranking</button>
      )}
    </div>
  ),
}));

vi.mock('@/component/common/confirm-dialog', () => ({
  default: () => null,
}));

vi.mock('@/component/common/empty-state', () => ({
  default: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      {description && <span>{description}</span>}
    </div>
  ),
}));

import * as leadsService from '@/service/leads';
import * as applicationsService from '@/service/applications';
import * as companiesService from '@/service/companies';
import * as aspirationsService from '@/service/aspirations';
import LeadsPage from '@/page/leads';

const mockedGetLeads = vi.mocked(leadsService.getLeads);
const mockedRankLeads = vi.mocked(leadsService.rankLeads);
const mockedGetCompanies = vi.mocked(companiesService.getCompanies);
const mockedGetAspirations = vi.mocked(aspirationsService.getAspirations);
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
    mockedRankLeads.mockReset();
    mockedGetCompanies.mockReset();
    mockedGetAspirations.mockReset();
    mockedCreateApplication.mockReset();
    mockedFindExistingApplicationForLead.mockReset();
    mockedGetAspirations.mockResolvedValue([] as never);
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
    mockedGetAspirations.mockResolvedValue([{ id: 'asp-1', kind: 'role', label: 'Staff Engineer' }] as never);

    renderPage();

    expect(await screen.findByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
  });

  it('renders the extraction bar', async () => {
    mockedGetLeads.mockResolvedValue({ items: [makeLead()], total: 1, page: 1, page_size: 500 } as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([{ id: 'asp-1', kind: 'role', label: 'Staff Engineer' }] as never);

    renderPage();

    await screen.findByText('Senior Frontend Engineer');

    expect(screen.getByTestId('extraction-bar')).toBeInTheDocument();
  });

  it('renders empty state when there are no leads', async () => {
    mockedGetLeads.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 500 } as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([{ id: 'asp-1', kind: 'role', label: 'Staff Engineer' }] as never);

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
    mockedGetAspirations.mockResolvedValue([{ id: 'asp-1', kind: 'role', label: 'Staff Engineer' }] as never);

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
    mockedGetAspirations.mockResolvedValue([{ id: 'asp-1', kind: 'role', label: 'Staff Engineer' }] as never);
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
    mockedGetAspirations.mockResolvedValue([{ id: 'asp-1', kind: 'role', label: 'Staff Engineer' }] as never);
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

  it('disables ranking when the user has no aspirations', async () => {
    mockedGetLeads.mockResolvedValue({ items: [makeLead()], total: 1, page: 1, page_size: 500 } as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([] as never);

    renderPage();

    await screen.findByText('Senior Frontend Engineer');
    expect(screen.getByRole('button', { name: 'Rank with aspirations' })).toBeDisabled();
  });

  it('disables ranking when more than 20 filtered leads are in view', async () => {
    mockedGetLeads.mockResolvedValue({
      items: Array.from({ length: 21 }, (_, index) => makeLead({
        id: `lead-${index + 1}`,
        title: `Lead ${index + 1}`,
      })),
      total: 21,
      page: 1,
      page_size: 500,
    } as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([{ id: 'asp-1', kind: 'role', label: 'Staff Engineer' }] as never);

    renderPage();

    await screen.findByText('Lead 1');
    expect(screen.getByRole('button', { name: 'Rank with aspirations' })).toBeDisabled();
    expect(
      screen.getByText('Aspiration matching is limited to 20 leads at a time. Narrow your search or filters to continue.'),
    ).toBeInTheDocument();
    expect(mockedRankLeads).not.toHaveBeenCalled();
  });

  it('reorders leads and decorates ranked cards after aspiration-aware ranking', async () => {
    const user = userEvent.setup();

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
    mockedGetAspirations.mockResolvedValue([{ id: 'asp-1', kind: 'role', label: 'Staff Engineer' }] as never);
    mockedRankLeads.mockResolvedValue({
      ranking: 'Lead Rankings',
      ranked_leads: [
        {
          lead_id: 'lead-2',
          lead_index: 2,
          title: 'Backend Engineer',
          relevance_score: 9,
          explanation: 'Strong backend match.',
          aspiration_alignment: 'Direct match to the user aspiration.',
        },
        {
          lead_id: 'lead-1',
          lead_index: 1,
          title: 'Senior Frontend Engineer',
          relevance_score: 6,
          explanation: 'Partial UI match.',
          aspiration_alignment: null,
        },
      ],
    } as never);

    renderPage();

    await screen.findByText('Senior Frontend Engineer');
    await user.click(screen.getByRole('button', { name: 'Rank with aspirations' }));

    await waitFor(() => {
      expect(mockedRankLeads).toHaveBeenCalledWith('test-token', [
        {
          id: 'lead-1',
          title: 'Senior Frontend Engineer',
          description: 'Build awesome UIs',
        },
        {
          id: 'lead-2',
          title: 'Backend Engineer',
          description: 'Build awesome UIs',
        },
      ]);
    });

    const cards = screen.getAllByTestId('lead-card');
    expect(cards[0]).toHaveTextContent('Backend Engineer');
    expect(cards[0]).toHaveTextContent('Aspiration fit 9/10');
    expect(screen.getByRole('button', { name: 'Clear ranking' })).toBeInTheDocument();
  });

  it('clears active ranking when the search query changes', async () => {
    const user = userEvent.setup();

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
    mockedGetAspirations.mockResolvedValue([{ id: 'asp-1', kind: 'role', label: 'Staff Engineer' }] as never);
    mockedRankLeads.mockResolvedValue({
      ranking: 'Lead Rankings',
      ranked_leads: [
        {
          lead_id: 'lead-2',
          lead_index: 2,
          title: 'Backend Engineer',
          relevance_score: 9,
          explanation: 'Strong backend match.',
          aspiration_alignment: 'Direct match to the user aspiration.',
        },
      ],
    } as never);

    renderPage();

    await screen.findByText('Senior Frontend Engineer');
    await user.click(screen.getByRole('button', { name: 'Rank with aspirations' }));
    expect(await screen.findByRole('button', { name: 'Clear ranking' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Search leads'), 'Backend');

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Clear ranking' })).not.toBeInTheDocument();
    });
  });

  it('ignores a stale ranking response after the search changes mid-request', async () => {
    const user = userEvent.setup();
    let resolveRanking: ((value: unknown) => void) | undefined;

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
    mockedGetAspirations.mockResolvedValue([{ id: 'asp-1', kind: 'role', label: 'Staff Engineer' }] as never);
    mockedRankLeads.mockReturnValue(new Promise((resolve) => {
      resolveRanking = resolve;
    }) as never);

    renderPage();

    await screen.findByText('Senior Frontend Engineer');
    await user.click(screen.getByRole('button', { name: 'Rank with aspirations' }));

    await user.type(screen.getByLabelText('Search leads'), 'Backend');
    await waitFor(() => {
      expect(screen.queryByText('Senior Frontend Engineer')).not.toBeInTheDocument();
    });

    await act(async () => {
      resolveRanking?.({
        ranking: 'Lead Rankings',
        ranked_leads: [
          {
            lead_id: 'lead-2',
            lead_index: 2,
            title: 'Backend Engineer',
            relevance_score: 9,
            explanation: 'Strong backend match.',
            aspiration_alignment: 'Direct match to the user aspiration.',
          },
        ],
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Clear ranking' })).not.toBeInTheDocument();
    });

    const cards = screen.getAllByTestId('lead-card');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('Backend Engineer');
    expect(cards[0]).not.toHaveTextContent('Aspiration fit 9/10');
  });
});
