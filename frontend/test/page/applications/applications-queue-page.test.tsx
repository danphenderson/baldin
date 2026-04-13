import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import { UserContext } from '@/context/user-context';
import { createBaldinTheme } from '@/design-system/theme';
import { ToolbarHeaderContext } from '@/layout/toolbar-header-context';

/* ── Mock the useApplications hook ────────────────────────────────── */

const mockUseApplications = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/page/applications/use-applications', async () => {
  const actual = await vi.importActual<typeof import('@/page/applications/use-applications')>('@/page/applications/use-applications');
  return {
    ...actual,
    useApplications: (...args: unknown[]) => mockUseApplications(...args),
  };
});

vi.mock('@/component/common/confirm-dialog', () => ({
  default: () => null,
}));

vi.mock('@/component/common/empty-state', () => ({
  default: ({ title, description, action }: {
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
  }) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      {description && <span>{description}</span>}
      {action && <button onClick={action.onClick}>{action.label}</button>}
    </div>
  ),
}));

import ApplicationsQueuePage from '@/page/applications/applications-queue-page';
// Static stage columns for assertions (colors not needed in tests)
const STAGE_COLUMNS = [
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
];

/* ── Test data ────────────────────────────────────────────────────── */

function makeApplication(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'app-1',
    status: 'applied',
    stage: 'applied',
    outcome: null,
    document_metadata: {
      total_count: 0,
      has_resume: false,
      has_cover_letter: false,
      kinds: [],
    },
    created_at: '2026-04-01T00:00:00',
    updated_at: '2026-04-03T00:00:00',
    next_step: null,
    next_step_due: null,
    lead: {
      id: 'lead-1',
      title: 'Senior Frontend Engineer',
      location: 'Remote, US',
      salary: '$150k',
      companies: [{ id: 'c-1', name: 'Acme Corp' }],
    },
    ...overrides,
  };
}

function makeHookReturn(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    applications: [],
    loading: false,
    error: '',
    success: '',
    setError: vi.fn(),
    setSuccess: vi.fn(),
    refresh: vi.fn(),
    handleAdvance: vi.fn(),
    handleDelete: vi.fn(),
    confirmDelete: vi.fn(),
    deleteTarget: null,
    setDeleteTarget: vi.fn(),
    handleStatusChange: vi.fn(),
    handleClose: vi.fn(),
    registeredApps: [],
    closedApps: [],
    buckets: new Map(),
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
  const theme = createBaldinTheme('dark');

  return render(
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <ToolbarHeaderContext.Provider value={vi.fn()}>
        <UserContext.Provider value={userContextValue}>
          <MemoryRouter>
            <ApplicationsQueuePage />
          </MemoryRouter>
        </UserContext.Provider>
      </ToolbarHeaderContext.Provider>
    </MuiThemeProvider>,
  );
}

/* ── Tests ────────────────────────────────────────────────────────── */

describe('ApplicationsQueuePage', () => {
  beforeEach(() => {
    mockUseApplications.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons while data is being fetched', () => {
    mockUseApplications.mockReturnValue(makeHookReturn({ loading: true }));

    renderPage();

    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders application cards when data loads', () => {
    mockUseApplications.mockReturnValue(
      makeHookReturn({
        applications: [
          makeApplication(),
          makeApplication({
            id: 'app-2',
            status: 'interview',
            lead: {
              id: 'lead-2',
              title: 'Backend Engineer',
              companies: [{ id: 'c-2', name: 'BigCo' }],
            },
          }),
        ],
      }),
    );

    renderPage();

    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
  });

  it('uses the shared card shell for queue rows and keeps nested keyboard actions isolated', async () => {
    const user = userEvent.setup();
    const hooks = makeHookReturn({
      applications: [makeApplication()],
    });
    mockUseApplications.mockReturnValue(hooks);

    renderPage();

    const row = screen.getByRole('button', { name: 'View Senior Frontend Engineer details' });
    await user.click(row);
    expect(mockNavigate).toHaveBeenCalledWith('/applications/app-1');

    const advanceButton = screen.getByRole('button', { name: 'Advance application' });
    await act(async () => {
      advanceButton.focus();
    });
    await user.keyboard('{Enter}');

    expect(hooks.handleAdvance).toHaveBeenCalledWith(expect.objectContaining({ id: 'app-1' }));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('renders document-count badges from application list data', () => {
    mockUseApplications.mockReturnValue(
      makeHookReturn({
        applications: [makeApplication({
          document_metadata: {
            total_count: 3,
            has_resume: true,
            has_cover_letter: true,
            kinds: ['resume', 'cover_letter'],
          },
        })],
      }),
    );

    renderPage();

    expect(screen.getByText('3 docs')).toBeInTheDocument();
  });

  it('filters applications by resume metadata from the API response', async () => {
    const user = userEvent.setup();
    mockUseApplications.mockReturnValue(
      makeHookReturn({
        applications: [
          makeApplication({
            id: 'app-1',
            lead: {
              id: 'lead-1',
              title: 'Senior Frontend Engineer',
              location: 'Remote, US',
              salary: '$150k',
              companies: [{ id: 'c-1', name: 'Acme Corp' }],
            },
            document_metadata: {
              total_count: 2,
              has_resume: true,
              has_cover_letter: false,
              kinds: ['resume'],
            },
          }),
          makeApplication({
            id: 'app-2',
            lead: {
              id: 'lead-2',
              title: 'Backend Engineer',
              location: 'Hybrid',
              salary: '$140k',
              companies: [{ id: 'c-2', name: 'BigCo' }],
            },
            document_metadata: {
              total_count: 1,
              has_resume: false,
              has_cover_letter: true,
              kinds: ['cover_letter'],
            },
          }),
        ],
      }),
    );

    renderPage();

    await user.click(screen.getByText('Has Resume'));

    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument();
  });

  it('filters applications by cover-letter metadata from the API response', async () => {
    const user = userEvent.setup();
    mockUseApplications.mockReturnValue(
      makeHookReturn({
        applications: [
          makeApplication({
            id: 'app-1',
            lead: {
              id: 'lead-1',
              title: 'Senior Frontend Engineer',
              location: 'Remote, US',
              salary: '$150k',
              companies: [{ id: 'c-1', name: 'Acme Corp' }],
            },
            document_metadata: {
              total_count: 2,
              has_resume: true,
              has_cover_letter: false,
              kinds: ['resume'],
            },
          }),
          makeApplication({
            id: 'app-2',
            lead: {
              id: 'lead-2',
              title: 'Backend Engineer',
              location: 'Hybrid',
              salary: '$140k',
              companies: [{ id: 'c-2', name: 'BigCo' }],
            },
            document_metadata: {
              total_count: 1,
              has_resume: false,
              has_cover_letter: true,
              kinds: ['cover_letter'],
            },
          }),
        ],
      }),
    );

    renderPage();

    await user.click(screen.getByText('Has Cover Letter'));

    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Senior Frontend Engineer')).not.toBeInTheDocument();
  });

  it('renders stage filter chips for each pipeline column', () => {
    mockUseApplications.mockReturnValue(
      makeHookReturn({ applications: [makeApplication()] }),
    );

    renderPage();

    expect(screen.getByText('All Stages')).toBeInTheDocument();
    for (const col of STAGE_COLUMNS) {
      // Stage labels may appear in both summary strip and filter chips
      const matches = screen.getAllByText(col.label);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('renders one separator between the two filter groups', () => {
    mockUseApplications.mockReturnValue(
      makeHookReturn({ applications: [makeApplication()] }),
    );

    renderPage();

    expect(screen.getByTestId('applications-filter-divider')).toBeInTheDocument();
  });

  it('renders sort controls', () => {
    mockUseApplications.mockReturnValue(
      makeHookReturn({ applications: [makeApplication()] }),
    );

    renderPage();

    expect(screen.getByLabelText('Sort')).toBeInTheDocument();
  });

  it('renders summary chips with correct counts', () => {
    mockUseApplications.mockReturnValue(
      makeHookReturn({
        applications: [
          makeApplication({ id: 'a1', status: 'applied' }),
          makeApplication({ id: 'a2', status: 'interview', stage: 'interview' }),
          makeApplication({ id: 'a3', status: 'offer', stage: 'offer' }),
          makeApplication({ id: 'a4', status: 'rejected', stage: null, outcome: 'rejected' }),
        ],
      }),
    );

    renderPage();

    // MetricStrip renders value and label in separate Typography elements.
    // Some labels (Active, Closed) also appear in filter chips, so use getAllByText.
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Interviewing')).toBeInTheDocument();
    expect(screen.getByText('Offers')).toBeInTheDocument();
    expect(screen.getAllByText('Closed').length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state when there are no applications', () => {
    mockUseApplications.mockReturnValue(makeHookReturn({ applications: [] }));

    renderPage();

    expect(screen.getByText('No applications tracked')).toBeInTheDocument();
  });

  it('renders "no matches" empty state when filters exclude all apps', async () => {
    const user = userEvent.setup();
    mockUseApplications.mockReturnValue(
      makeHookReturn({
        applications: [makeApplication()],
      }),
    );

    renderPage();

    // Search for something that doesn't match
    const searchInput = screen.getByLabelText('Search applications');
    await user.type(searchInput, 'zzz-nonexistent');

    await waitFor(() => {
      expect(screen.getByText('No results match your filters')).toBeInTheDocument();
    });
  });
});
