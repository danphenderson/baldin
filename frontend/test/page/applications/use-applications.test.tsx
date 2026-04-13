import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplications } from '@/page/applications/use-applications';
import type { ApplicationDetailRead } from '@/service/applications';
import * as applicationService from '@/service/applications';

vi.mock('@/service/applications', () => ({
  getApplications: vi.fn(),
  updateApplication: vi.fn(),
  deleteApplication: vi.fn(),
}));

function makeApplication(overrides: Partial<Record<string, unknown>> = {}): ApplicationDetailRead {
  return {
    id: 'app-1',
    lead_id: 'lead-1',
    user_id: 'user-1',
    status: 'rejected',
    stage: null,
    outcome: 'rejected',
    document_metadata: {
      total_count: 1,
      has_resume: true,
      has_cover_letter: false,
      kinds: ['resume'],
    },
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-03T00:00:00Z',
    notes: null,
    next_step: null,
    next_step_due: null,
    outcome_reason: 'Role closed internally',
    status_history: [],
    lead: {
      id: 'lead-1',
      title: 'Senior Frontend Engineer',
      canonical_url: 'https://jobs.example.com/roles/123',
      url: 'https://jobs.example.com/roles/123',
      companies: [],
    },
    user: {
      id: 'user-1',
      email: 'jane@example.com',
      is_active: true,
      is_superuser: false,
      is_verified: true,
    },
    ...overrides,
  } as unknown as ApplicationDetailRead;
}

describe('useApplications', () => {
  beforeEach(() => {
    vi.mocked(applicationService.getApplications).mockReset();
    vi.mocked(applicationService.updateApplication).mockReset();
    vi.mocked(applicationService.deleteApplication).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sends reopen=true when a closed application moves back to an active stage', async () => {
    vi.mocked(applicationService.getApplications).mockResolvedValue([makeApplication()]);
    vi.mocked(applicationService.updateApplication).mockResolvedValue(
      makeApplication({
        status: 'screening',
        stage: 'screening',
        outcome: null,
        outcome_reason: null,
      }),
    );

    const { result } = renderHook(() => useApplications('test-token'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.applications).toHaveLength(1);
    });

    await act(async () => {
      await result.current.handleStatusChange('app-1', 'screening');
    });

    expect(applicationService.updateApplication).toHaveBeenCalledWith('test-token', 'app-1', {
      stage: 'screening',
      outcome: null,
      reopen: true,
    });
  });
});
