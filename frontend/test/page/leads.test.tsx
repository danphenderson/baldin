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
  getAllLeads: vi.fn(),
  createLead: vi.fn(),
  updateLead: vi.fn(),
  deleteLead: vi.fn(),
  extractLead: vi.fn(),
  rankLeads: vi.fn(),
}));

vi.mock('@/service/applications', () => ({
  createApplication: vi.fn(),
  getApplications: vi.fn(),
  findExistingApplicationForLead: vi.fn(),
  getApplicationStateLabel: vi.fn(
    (application: { outcome?: string | null; stage?: string | null }) =>
      application.outcome ?? application.stage ?? 'tracked',
  ),
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
    applicationHandoff,
    onApply,
  }: {
    lead: { title?: string } & Record<string, unknown>;
    ranking?: { relevanceScore: number } | null;
    applicationHandoff?: {
      state: 'ready' | 'already-applied';
      message: string;
      applicationLabel?: string;
      ctaLabel?: string;
    } | null;
    onApply: (
      lead: Record<string, unknown>,
      intent: 'registered' | 'applied',
    ) => void;
  }) => (
    <div data-testid="lead-card">
      <span>{lead.title ?? 'Untitled'}</span>
      {ranking && <span>{`Rank score ${ranking.relevanceScore}/10`}</span>}
      {applicationHandoff && (
        <>
          <span>{applicationHandoff.message}</span>
          {applicationHandoff.applicationLabel && (
            <span>{`Existing application: ${applicationHandoff.applicationLabel}`}</span>
          )}
        </>
      )}
      <button
        disabled={applicationHandoff?.state === 'already-applied'}
        onClick={() => onApply(lead, 'registered')}
      >
        Register interest for {lead.title ?? 'Untitled'}
      </button>
      <button
        disabled={applicationHandoff?.state === 'already-applied'}
        onClick={() => onApply(lead, 'applied')}
      >
        Apply now for {lead.title ?? 'Untitled'}
      </button>
    </div>
  ),
}));

vi.mock('@/component/lead-modal', () => ({
  default: ({
    open,
    leadId,
    hasExistingApplication,
    applicationCtaLabel,
  }: {
    open: boolean;
    leadId: string | null;
    hasExistingApplication?: boolean;
    applicationCtaLabel?: string;
  }) =>
    open ? (
      <div data-testid="lead-modal">
        <span>{leadId}</span>
        <span>
          {hasExistingApplication ? 'existing-application' : 'new-application'}
        </span>
        <span>{applicationCtaLabel ?? 'Create Application'}</span>
      </div>
    ) : null,
}));

vi.mock('@/component/lead-extraction-bar', () => ({
  default: ({
    url,
    onUrlChange,
    onExtract,
  }: {
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
  default: ({
    search,
    rankingActive,
    rankingPending,
    rankingDisabledReason,
    onSearchChange,
    onRank,
    onClearRanking,
  }: {
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
      <button
        onClick={onRank}
        disabled={Boolean(rankingDisabledReason) || rankingPending}
      >
        Rank with aspirations
      </button>
      {rankingDisabledReason && <span>{rankingDisabledReason}</span>}
      {rankingActive && <button onClick={onClearRanking}>Clear ranking</button>}
    </div>
  ),
}));

import * as leadsService from '@/service/leads';
import * as applicationsService from '@/service/applications';
import * as companiesService from '@/service/companies';
import * as aspirationsService from '@/service/aspirations';
import LeadsPage from '@/page/leads';

const mockedGetAllLeads = vi.mocked(leadsService.getAllLeads);
const mockedRankLeads = vi.mocked(leadsService.rankLeads);
const mockedGetCompanies = vi.mocked(companiesService.getCompanies);
const mockedGetAspirations = vi.mocked(aspirationsService.getAspirations);
const mockedCreateApplication = vi.mocked(
  applicationsService.createApplication,
);
const mockedGetApplications = vi.mocked(applicationsService.getApplications);
const mockedFindExistingApplicationForLead = vi.mocked(
  applicationsService.findExistingApplicationForLead,
);

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
  user: {
    id: 'u1',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@test.com',
  } as never,
  setUser: vi.fn(),
  token: 'test-token',
  setToken: vi.fn(),
  loading: false,
  canAccessTier: vi.fn(() => true),
};

function renderPage(initialEntries: string[] = ['/']) {
  return render(
    <ToolbarHeaderContext.Provider value={vi.fn()}>
      <UserContext.Provider value={userContextValue}>
        <NotificationProvider>
          <MemoryRouter initialEntries={initialEntries}>
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
    mockedGetAllLeads.mockReset();
    mockedRankLeads.mockReset();
    mockedGetCompanies.mockReset();
    mockedGetAspirations.mockReset();
    mockedCreateApplication.mockReset();
    mockedGetApplications.mockReset();
    mockedFindExistingApplicationForLead.mockReset();
    mockedGetApplications.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([] as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons while data is being fetched', () => {
    mockedGetAllLeads.mockReturnValue(new Promise(() => {}));
    mockedGetCompanies.mockReturnValue(new Promise(() => {}));

    renderPage();

    // MUI Skeleton elements render during loading
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders lead list when data loads', async () => {
    mockedGetAllLeads.mockResolvedValue([
      makeLead(),
      makeLead({ id: 'lead-2', title: 'Backend Engineer', location: 'NYC' }),
    ] as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([
      { id: 'asp-1', kind: 'role', label: 'Staff Engineer' },
    ] as never);

    renderPage();

    expect(
      await screen.findByText('Senior Frontend Engineer'),
    ).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
  });

  it('renders the extraction bar', async () => {
    mockedGetAllLeads.mockResolvedValue([makeLead()] as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([
      { id: 'asp-1', kind: 'role', label: 'Staff Engineer' },
    ] as never);

    renderPage();

    await screen.findByText('Senior Frontend Engineer');

    expect(screen.getByTestId('extraction-bar')).toBeInTheDocument();
  });

  it('renders empty state when there are no leads', async () => {
    mockedGetAllLeads.mockResolvedValue([] as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([
      { id: 'asp-1', kind: 'role', label: 'Staff Engineer' },
    ] as never);

    renderPage();

    expect(
      await screen.findByText('No leads imported yet'),
    ).toBeInTheDocument();
  });

  it('filters leads with the search bar', async () => {
    const user = userEvent.setup();

    mockedGetAllLeads.mockResolvedValue([
      makeLead(),
      makeLead({ id: 'lead-2', title: 'Data Scientist', location: 'London' }),
    ] as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([
      { id: 'asp-1', kind: 'role', label: 'Staff Engineer' },
    ] as never);

    renderPage();

    // Wait for cards to appear
    expect(
      await screen.findByText('Senior Frontend Engineer'),
    ).toBeInTheDocument();
    expect(screen.getByText('Data Scientist')).toBeInTheDocument();

    // Type in search
    const searchInput = screen.getByLabelText('Search leads');
    await user.type(searchInput, 'Data');

    // The non-matching lead should disappear
    await waitFor(() => {
      expect(
        screen.queryByText('Senior Frontend Engineer'),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText('Data Scientist')).toBeInTheDocument();
  });

  it('creates a registered application when register interest is selected', async () => {
    const user = userEvent.setup();

    mockedGetAllLeads.mockResolvedValue([makeLead()] as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([
      { id: 'asp-1', kind: 'role', label: 'Staff Engineer' },
    ] as never);
    mockedCreateApplication.mockResolvedValue({
      id: 'app-1',
      lead_id: 'lead-1',
      stage: 'registered',
      outcome: null,
    } as never);

    renderPage();

    await screen.findByText('Senior Frontend Engineer');
    await user.click(
      screen.getByRole('button', {
        name: 'Register interest for Senior Frontend Engineer',
      }),
    );

    await waitFor(() => {
      expect(mockedGetApplications).toHaveBeenCalledWith('test-token');
      expect(mockedFindExistingApplicationForLead).not.toHaveBeenCalled();
      expect(mockedCreateApplication).toHaveBeenCalledWith('test-token', {
        lead_id: 'lead-1',
        stage: 'registered',
      });
    });
  });

  it('renders duplicate handoff state from the preloaded application index', async () => {
    mockedGetAllLeads.mockResolvedValue([makeLead()] as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([
      { id: 'asp-1', kind: 'role', label: 'Staff Engineer' },
    ] as never);
    mockedGetApplications.mockResolvedValue([
      {
        id: 'app-1',
        lead_id: 'lead-1',
        status: 'applied',
        stage: 'applied',
        outcome: null,
      },
    ] as never);

    renderPage();

    await screen.findByText('Senior Frontend Engineer');

    expect(
      await screen.findByText(
        'An existing application is already in the pipeline for this lead.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Existing application: Applied'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Apply now for Senior Frontend Engineer',
      }),
    ).toBeDisabled();
    expect(mockedFindExistingApplicationForLead).not.toHaveBeenCalled();
  });

  it('falls back to per-click duplicate lookup when applications fail to preload', async () => {
    const user = userEvent.setup();

    mockedGetAllLeads.mockResolvedValue([makeLead()] as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([
      { id: 'asp-1', kind: 'role', label: 'Staff Engineer' },
    ] as never);
    mockedGetApplications.mockRejectedValue(
      new Error('applications unavailable'),
    );
    mockedFindExistingApplicationForLead.mockResolvedValue({
      id: 'app-1',
      lead_id: 'lead-1',
      status: 'applied',
      stage: 'applied',
      outcome: null,
    } as never);

    renderPage();

    await screen.findByText('Senior Frontend Engineer');
    await user.click(
      screen.getByRole('button', {
        name: 'Apply now for Senior Frontend Engineer',
      }),
    );

    await waitFor(() => {
      expect(mockedFindExistingApplicationForLead).toHaveBeenCalledWith(
        'test-token',
        'lead-1',
      );
    });
    expect(mockedCreateApplication).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        '"Senior Frontend Engineer" already exists in your applications as applied.',
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Existing application: Applied'),
    ).toBeInTheDocument();
  });

  it('adds newly created applications into page-local duplicate state', async () => {
    const user = userEvent.setup();

    mockedGetAllLeads.mockResolvedValue([makeLead()] as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([
      { id: 'asp-1', kind: 'role', label: 'Staff Engineer' },
    ] as never);
    mockedCreateApplication.mockResolvedValue({
      id: 'app-1',
      lead_id: 'lead-1',
      stage: 'applied',
      outcome: null,
    } as never);

    renderPage();

    await screen.findByText('Senior Frontend Engineer');
    await user.click(
      screen.getByRole('button', {
        name: 'Apply now for Senior Frontend Engineer',
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByText('Existing application: Applied'),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', {
        name: 'Apply now for Senior Frontend Engineer',
      }),
    ).toBeDisabled();
    expect(mockedCreateApplication).toHaveBeenCalledTimes(1);
  });

  it('opens the lead modal from the leadId query param and carries duplicate CTA state', async () => {
    mockedGetAllLeads.mockResolvedValue([makeLead()] as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([
      { id: 'asp-1', kind: 'role', label: 'Staff Engineer' },
    ] as never);
    mockedGetApplications.mockResolvedValue([
      {
        id: 'app-1',
        lead_id: 'lead-1',
        status: 'applied',
        stage: 'applied',
        outcome: null,
      },
    ] as never);

    renderPage(['/leads?leadId=lead-1']);

    expect(
      await screen.findByText('Senior Frontend Engineer'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('lead-modal')).toHaveTextContent('lead-1');
    });
    expect(screen.getByTestId('lead-modal')).toHaveTextContent(
      'existing-application',
    );
    expect(screen.getByTestId('lead-modal')).toHaveTextContent(
      'Application exists',
    );
  });

  it('disables ranking when the user has no aspirations', async () => {
    mockedGetAllLeads.mockResolvedValue([makeLead()] as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([] as never);

    renderPage();

    await screen.findByText('Senior Frontend Engineer');
    expect(
      screen.getByRole('button', { name: 'Rank with aspirations' }),
    ).toBeDisabled();
  });

  it('disables ranking when more than 20 filtered leads are in view', async () => {
    mockedGetAllLeads.mockResolvedValue(
      Array.from({ length: 21 }, (_, index) =>
        makeLead({
          id: `lead-${index + 1}`,
          title: `Lead ${index + 1}`,
        }),
      ) as never,
    );
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([
      { id: 'asp-1', kind: 'role', label: 'Staff Engineer' },
    ] as never);

    renderPage();

    await screen.findByText('Lead 1');
    expect(
      screen.getByRole('button', { name: 'Rank with aspirations' }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        'Aspiration matching is limited to 20 leads at a time. Narrow your search or filters to continue.',
      ),
    ).toBeInTheDocument();
    expect(mockedRankLeads).not.toHaveBeenCalled();
  });

  it('reorders leads and decorates ranked cards after aspiration-aware ranking', async () => {
    const user = userEvent.setup();

    mockedGetAllLeads.mockResolvedValue([
      makeLead(),
      makeLead({ id: 'lead-2', title: 'Backend Engineer', location: 'NYC' }),
    ] as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([
      { id: 'asp-1', kind: 'role', label: 'Staff Engineer' },
    ] as never);
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
    await user.click(
      screen.getByRole('button', { name: 'Rank with aspirations' }),
    );

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
    expect(cards[0]).toHaveTextContent('Rank score 9/10');
    expect(
      screen.getByRole('button', { name: 'Clear ranking' }),
    ).toBeInTheDocument();
  });

  it('clears active ranking when the search query changes', async () => {
    const user = userEvent.setup();

    mockedGetAllLeads.mockResolvedValue([
      makeLead(),
      makeLead({ id: 'lead-2', title: 'Backend Engineer', location: 'NYC' }),
    ] as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([
      { id: 'asp-1', kind: 'role', label: 'Staff Engineer' },
    ] as never);
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
    await user.click(
      screen.getByRole('button', { name: 'Rank with aspirations' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Clear ranking' }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Search leads'), 'Backend');

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Clear ranking' }),
      ).not.toBeInTheDocument();
    });
  });

  it('ignores a stale ranking response after the search changes mid-request', async () => {
    const user = userEvent.setup();
    let resolveRanking: ((value: unknown) => void) | undefined;

    mockedGetAllLeads.mockResolvedValue([
      makeLead(),
      makeLead({ id: 'lead-2', title: 'Backend Engineer', location: 'NYC' }),
    ] as never);
    mockedGetCompanies.mockResolvedValue([] as never);
    mockedGetAspirations.mockResolvedValue([
      { id: 'asp-1', kind: 'role', label: 'Staff Engineer' },
    ] as never);
    mockedRankLeads.mockReturnValue(
      new Promise((resolve) => {
        resolveRanking = resolve;
      }) as never,
    );

    renderPage();

    await screen.findByText('Senior Frontend Engineer');
    await user.click(
      screen.getByRole('button', { name: 'Rank with aspirations' }),
    );

    await user.type(screen.getByLabelText('Search leads'), 'Backend');
    await waitFor(() => {
      expect(
        screen.queryByText('Senior Frontend Engineer'),
      ).not.toBeInTheDocument();
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
      expect(
        screen.queryByRole('button', { name: 'Clear ranking' }),
      ).not.toBeInTheDocument();
    });

    const cards = screen.getAllByTestId('lead-card');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('Backend Engineer');
    expect(cards[0]).not.toHaveTextContent('Rank score 9/10');
  });
});
