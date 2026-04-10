import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { ToolbarHeaderContext } from '../../layout/toolbar-header-context';

vi.mock('../../component/create-action-item-dialog', () => ({
  default: () => null,
}));

vi.mock('../../service/applications', async () => {
  const actual = await vi.importActual<typeof import('../../service/applications')>('../../service/applications');
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

vi.mock('../../service/documents', () => ({
  getDocuments: vi.fn(),
  downloadDocument: vi.fn(),
  generateDocument: vi.fn(),
}));

import * as applicationService from '../../service/applications';
import * as documentService from '../../service/documents';
import ApplicationDetailPage from './applications-detail-page';

function makeApplication(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'app-123',
    status: 'applied',
    stage: 'applied',
    outcome: null,
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
  } as applicationService.ApplicationRead;
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
        <MemoryRouter initialEntries={[`/applications/${applicationId}`]}>
          <Routes>
            <Route path="/applications/:applicationId" element={<ApplicationDetailPage />} />
          </Routes>
        </MemoryRouter>
      </UserContext.Provider>
    </ToolbarHeaderContext.Provider>,
  );
}

describe('ApplicationDetailPage', () => {
  afterEach(() => {
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

  it('shows an error state when the direct application fetch fails', async () => {
    vi.mocked(applicationService.getApplication).mockRejectedValue(new Error('Application not found'));

    renderPage('missing-app');

    expect(await screen.findByText('Application not found')).toBeInTheDocument();
    expect(applicationService.getApplication).toHaveBeenCalledWith('test-token', 'missing-app');
  });
});
