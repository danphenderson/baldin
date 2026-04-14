import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UserContext } from '@/context/user-context';
import { ToolbarHeaderContext } from '@/layout/toolbar-header-context';

const mockUseApplications = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@/page/applications/use-applications', async () => {
  const actual = await vi.importActual<typeof import('@/page/applications/use-applications')>('@/page/applications/use-applications');
  return {
    ...actual,
    useApplications: (...args: unknown[]) => mockUseApplications(...args),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import ApplicationsBoardPage from '@/page/applications/applications-board-page';

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
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-03T00:00:00Z',
    next_step: 'Send follow-up note',
    next_step_due: '2026-04-15T00:00:00',
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
  const application = makeApplication();
  return {
    applications: [application],
    loading: false,
    error: '',
    success: '',
    setError: vi.fn(),
    setSuccess: vi.fn(),
    refresh: vi.fn(),
    handleStatusChange: vi.fn(),
    handleAdvance: vi.fn(),
    handleClose: vi.fn(),
    handleDelete: vi.fn(),
    handleReminderUpdate: vi.fn().mockResolvedValue(application),
    confirmDelete: vi.fn(),
    deleteTarget: null,
    setDeleteTarget: vi.fn(),
    buckets: new Map([
      ['applied', [application]],
      ['screening', []],
      ['interview', []],
      ['offer', []],
    ]),
    registeredApps: [],
    closedApps: [],
    overdueCount: 0,
    ...overrides,
  };
}

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
        <MemoryRouter>
          <ApplicationsBoardPage />
        </MemoryRouter>
      </UserContext.Provider>
    </ToolbarHeaderContext.Provider>,
  );
}

describe('ApplicationsBoardPage', () => {
  beforeEach(() => {
    mockUseApplications.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('routes empty-board browse action through the shared empty state CTA', async () => {
    const user = userEvent.setup();
    mockUseApplications.mockReturnValue(
      makeHookReturn({
        applications: [],
        buckets: new Map([
          ['applied', []],
          ['screening', []],
          ['interview', []],
          ['offer', []],
        ]),
      }),
    );

    renderPage();

    await user.click(screen.getByRole('button', { name: 'Browse Leads' }));

    expect(mockNavigate).toHaveBeenCalledWith('/leads');
  });

  it('saves inline reminder edits from a board card', async () => {
    const user = userEvent.setup();
    const hookReturn = makeHookReturn();
    mockUseApplications.mockReturnValue(hookReturn);

    renderPage();

    await user.click(screen.getByRole('button', { name: 'Edit reminder for Senior Frontend Engineer' }));

    const nextStepInput = screen.getByLabelText('Reminder next step');
    const dueDateInput = screen.getByLabelText('Reminder due date');

    await user.clear(nextStepInput);
    await user.type(nextStepInput, 'Send thank-you note');
    await user.clear(dueDateInput);
    await user.type(dueDateInput, '2026-04-20');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(hookReturn.handleReminderUpdate).toHaveBeenCalledWith('app-1', {
        next_step: 'Send thank-you note',
        next_step_due: '2026-04-20T00:00:00',
      });
    });
  });

  it('renders document-count badges on board cards from list data', () => {
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
        buckets: new Map([
          ['applied', [makeApplication({
            document_metadata: {
              total_count: 3,
              has_resume: true,
              has_cover_letter: true,
              kinds: ['resume', 'cover_letter'],
            },
          })]],
          ['screening', []],
          ['interview', []],
          ['offer', []],
        ]),
      }),
    );

    renderPage();

    expect(screen.getByText('3 docs')).toBeInTheDocument();
  });

  it('uses the shared status handler when moving a closed card back into the pipeline', async () => {
    const user = userEvent.setup();
    const closedApplication = makeApplication({
      status: 'rejected',
      stage: null,
      outcome: 'rejected',
      document_metadata: {
        total_count: 2,
        has_resume: true,
        has_cover_letter: false,
        kinds: ['resume'],
      },
    });
    const hookReturn = makeHookReturn({
      applications: [closedApplication],
      buckets: new Map([
        ['applied', []],
        ['screening', []],
        ['interview', []],
        ['offer', []],
      ]),
      closedApps: [closedApplication],
    });
    mockUseApplications.mockReturnValue(hookReturn);

    renderPage();

    await user.click(screen.getByRole('button', { name: 'Move Senior Frontend Engineer to another lane' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Applied' }));

    expect(hookReturn.handleStatusChange).toHaveBeenCalledWith('app-1', 'applied');
  });

  it('uses the shared confirm dialog when deleting a board card', async () => {
    const user = userEvent.setup();
    const application = makeApplication();
    const confirmDelete = vi.fn();
    const handleDelete = vi.fn();
    mockUseApplications.mockImplementation(() => {
      const [deleteTarget, setDeleteTarget] = React.useState<typeof application | null>(null);
      return makeHookReturn({
        applications: [application],
        handleDelete: (target: typeof application) => {
          handleDelete(target);
          setDeleteTarget(target);
        },
        confirmDelete: async () => {
          confirmDelete();
          setDeleteTarget(null);
        },
        deleteTarget,
        setDeleteTarget,
        buckets: new Map([
          ['applied', [application]],
          ['screening', []],
          ['interview', []],
          ['offer', []],
        ]),
      });
    });

    renderPage();

    expect(screen.queryByText('Delete Application')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete application' }));

    expect(handleDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'app-1' }));
    expect(screen.getByText('Delete Application')).toBeInTheDocument();
    expect(screen.getByText(/Remove/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(confirmDelete).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Delete Application')).not.toBeInTheDocument();
    });
  });
});
