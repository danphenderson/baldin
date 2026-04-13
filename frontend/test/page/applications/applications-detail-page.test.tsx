import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NotificationProvider } from '@/context/notification-context';
import { UserContext } from '@/context/user-context';
import { ToolbarHeaderContext } from '@/layout/toolbar-header-context';

vi.mock('@/component/create-action-item-dialog', () => ({
  default: () => null,
}));

vi.mock('@/service/applications', async () => {
  const actual = await vi.importActual<typeof import('@/service/applications')>('@/service/applications');
  return {
    ...actual,
    getApplication: vi.fn(),
    getApplicationDocuments: vi.fn(),
    updateApplication: vi.fn(),
    deleteApplication: vi.fn(),
    addApplicationDocument: vi.fn(),
    detachApplicationDocument: vi.fn(),
  };
});

vi.mock('@/service/documents', () => ({
  getDocuments: vi.fn(),
  downloadDocument: vi.fn(),
  generateDocument: vi.fn(),
}));

import * as applicationService from '@/service/applications';
import * as documentService from '@/service/documents';
import ApplicationDetailPage from '@/page/applications/applications-detail-page';

function makeApplication(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'app-123',
    status: 'applied',
    stage: 'applied',
    outcome: null,
    outcome_reason: null,
    created_at: '2026-04-01T00:00:00',
    updated_at: '2026-04-03T00:00:00',
    notes: '',
    next_step: null,
    next_step_due: null,
    status_history: [],
    lead: {
      id: 'lead-1',
      title: 'Senior Frontend Engineer',
      companies: [{ id: 'company-1', name: 'Acme Corp' }],
    },
    ...overrides,
  } as unknown as applicationService.ApplicationDetailRead;
}

const userContextValue = {
  user: { id: 'u1', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com' } as never,
  setUser: vi.fn(),
  token: 'test-token',
  setToken: vi.fn(),
  loading: false,
  canAccessTier: vi.fn(() => true),
};

function renderPage(applicationId = 'app-123') {
  return render(
    <ToolbarHeaderContext.Provider value={vi.fn()}>
      <UserContext.Provider value={userContextValue}>
        <NotificationProvider>
          <MemoryRouter initialEntries={[`/applications/${applicationId}`]}>
            <Routes>
              <Route path="/applications/:applicationId" element={<ApplicationDetailPage />} />
            </Routes>
          </MemoryRouter>
        </NotificationProvider>
      </UserContext.Provider>
    </ToolbarHeaderContext.Provider>,
  );
}

describe('ApplicationDetailPage', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('loads the application by route id with getApplication', async () => {
    vi.mocked(applicationService.getApplication).mockResolvedValue(makeApplication());
    vi.mocked(applicationService.getApplicationDocuments).mockResolvedValue([]);
    vi.mocked(documentService.getDocuments).mockResolvedValue([]);

    renderPage('app-123');

    await waitFor(() => {
      expect(applicationService.getApplication).toHaveBeenCalledWith('test-token', 'app-123');
    });

    expect(await screen.findByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(applicationService.getApplicationDocuments).toHaveBeenCalledWith('test-token', 'app-123');
  });

  it('shows the separate Chat with Agent launcher next to Run Agent', async () => {
    vi.mocked(applicationService.getApplication).mockResolvedValue(makeApplication());
    vi.mocked(applicationService.getApplicationDocuments).mockResolvedValue([]);
    vi.mocked(documentService.getDocuments).mockResolvedValue([]);

    renderPage('app-123');

    expect(await screen.findByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run Agent' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chat with Agent' })).toBeInTheDocument();
  });

  it('shows an error state when the direct application fetch fails', async () => {
    vi.mocked(applicationService.getApplication).mockRejectedValue(new Error('Application not found'));

    renderPage('missing-app');

    expect(await screen.findByText('Application not found')).toBeInTheDocument();
    expect(applicationService.getApplication).toHaveBeenCalledWith('test-token', 'missing-app');
  });

  it('renders a duration-based status timeline for application history', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-10T12:00:00Z').getTime());

    vi.mocked(applicationService.getApplication).mockResolvedValue(makeApplication({
      status: 'rejected',
      stage: null,
      outcome: 'rejected',
      outcome_reason: 'Role closed internally',
      status_history: [
        { stage: 'applied', changed_at: '2026-04-01T12:00:00Z' },
        { stage: 'screening', changed_at: '2026-04-04T12:00:00Z' },
        { stage: 'rejected', outcome: 'rejected', changed_at: '2026-04-08T12:00:00Z' },
      ],
    }));
    vi.mocked(applicationService.getApplicationDocuments).mockResolvedValue([]);
    vi.mocked(documentService.getDocuments).mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Created in Applied')).toBeInTheDocument();
    expect(screen.getByText('Stayed in Applied for 3 days')).toBeInTheDocument();
    expect(screen.getByText('Applied → Screening')).toBeInTheDocument();
    expect(screen.getByText('In Rejected for 2 days')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Role closed internally')).toBeInTheDocument();

    nowSpy.mockRestore();
  });

  it('saves the outcome reason for a closed application', async () => {
    const user = userEvent.setup();
    vi.mocked(applicationService.getApplication).mockResolvedValue(makeApplication({
      status: 'withdrawn',
      stage: null,
      outcome: 'withdrawn',
      outcome_reason: null,
      status_history: [
        { stage: 'applied', changed_at: '2026-04-01T12:00:00Z' },
        { stage: 'withdrawn', outcome: 'withdrawn', changed_at: '2026-04-03T12:00:00Z' },
      ],
    }));
    vi.mocked(applicationService.getApplicationDocuments).mockResolvedValue([]);
    vi.mocked(documentService.getDocuments).mockResolvedValue([]);
    vi.mocked(applicationService.updateApplication).mockResolvedValue(makeApplication({
      status: 'withdrawn',
      stage: null,
      outcome: 'withdrawn',
      outcome_reason: 'Accepted another offer',
      status_history: [
        { stage: 'applied', changed_at: '2026-04-01T12:00:00Z' },
        { stage: 'withdrawn', outcome: 'withdrawn', changed_at: '2026-04-03T12:00:00Z' },
      ],
    }));

    renderPage();

    const reasonInput = await screen.findByLabelText('Outcome reason');
    await user.type(reasonInput, 'Accepted another offer');
    await user.tab();

    await waitFor(() => {
      expect(applicationService.updateApplication).toHaveBeenCalledWith('test-token', 'app-123', {
        outcome_reason: 'Accepted another offer',
      });
    });
  });

  it('sends reopen=true when moving a closed application back to an active stage', async () => {
    const user = userEvent.setup();
    vi.mocked(applicationService.getApplication).mockResolvedValue(makeApplication({
      status: 'rejected',
      stage: null,
      outcome: 'rejected',
      outcome_reason: 'Role closed internally',
      status_history: [
        { stage: 'applied', changed_at: '2026-04-01T12:00:00Z' },
        { stage: 'rejected', outcome: 'rejected', changed_at: '2026-04-03T12:00:00Z' },
      ],
    }));
    vi.mocked(applicationService.getApplicationDocuments).mockResolvedValue([]);
    vi.mocked(documentService.getDocuments).mockResolvedValue([]);
    vi.mocked(applicationService.updateApplication).mockResolvedValue(makeApplication({
      status: 'screening',
      stage: 'screening',
      outcome: null,
      outcome_reason: null,
      status_history: [
        { stage: 'applied', changed_at: '2026-04-01T12:00:00Z' },
        { stage: 'rejected', outcome: 'rejected', changed_at: '2026-04-03T12:00:00Z' },
        { stage: 'screening', changed_at: '2026-04-04T12:00:00Z' },
      ],
    }));

    renderPage();

    await screen.findByText('Senior Frontend Engineer');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Stage' }));
    await user.click(await screen.findByRole('option', { name: 'Screening' }));

    await waitFor(() => {
      expect(applicationService.updateApplication).toHaveBeenCalledWith('test-token', 'app-123', {
        stage: 'screening',
        outcome: null,
        reopen: true,
      });
    });
  });
});
