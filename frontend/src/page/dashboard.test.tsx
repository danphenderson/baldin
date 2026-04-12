import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UserContext } from '../context/user-context';
import { ToolbarHeaderContext } from '../layout/toolbar-header-context';

/* ── Mock service modules ─────────────────────────────────────────── */

vi.mock('../service/activity-feed', () => ({
  getActivityFeed: vi.fn(),
  getCommandCenterSummary: vi.fn(),
}));

vi.mock('../service/action-items', () => ({
  getActionItems: vi.fn(),
  updateActionItem: vi.fn(),
  reorderActionItems: vi.fn(),
}));

vi.mock('../service/leads', () => ({
  getLeads: vi.fn(),
  extractLead: vi.fn(),
}));

vi.mock('../component/create-action-item-dialog', () => ({
  default: () => null,
}));

import * as activityFeedService from '../service/activity-feed';
import * as actionItemsService from '../service/action-items';
import * as leadsService from '../service/leads';
import DashboardPage from './dashboard';

const mockedGetCommandCenterSummary = vi.mocked(activityFeedService.getCommandCenterSummary);
const mockedGetActivityFeed = vi.mocked(activityFeedService.getActivityFeed);
const mockedGetActionItems = vi.mocked(actionItemsService.getActionItems);
const mockedGetLeads = vi.mocked(leadsService.getLeads);

/* ── Test data ────────────────────────────────────────────────────── */

function makeSummary(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    lead_count: 12,
    unapplied_lead_count: 4,
    application_count: 5,
    active_application_count: 3,
    status_breakdown: { applied: 2, interview: 2, offer: 1 } as Record<string, number>,
    avg_days_per_stage: [
      { stage: 'applied', avg_days: 4.5, sample_size: 6 },
      { stage: 'interview', avg_days: 7, sample_size: 2 },
    ],
    offer_conversion_funnel: [
      { stage: 'applied', reached_count: 12, conversion_from_applied: 100 },
      { stage: 'screening', reached_count: 8, conversion_from_previous: 66.7, conversion_from_applied: 66.7 },
      { stage: 'interview', reached_count: 4, conversion_from_previous: 50, conversion_from_applied: 33.3 },
      { stage: 'offer', reached_count: 2, conversion_from_previous: 50, conversion_from_applied: 16.7 },
    ],
    pending_action_items: 4,
    overdue_action_items: 1,
    action_items_due_today: 2,
    pending_connections: 6,
    unread_messages: 0,
    profile_completion: 75,
    documents_count: 2,
    draft_documents_count: 1,
    ...overrides,
  };
}

function makeActionItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'ai-1',
    title: 'Follow up with Google recruiter',
    kind: 'follow_up',
    priority: 'high',
    status: 'pending',
    due_at: '2026-04-10T00:00:00',
    sort_order: 0,
    created_at: '2026-04-01T00:00:00',
    updated_at: '2026-04-01T00:00:00',
    application_id: null,
    lead_id: null,
    document_id: null,
    conversation_id: null,
    application: null,
    lead: null,
    document: null,
    ...overrides,
  };
}

function makeFeedItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    type: 'status_change',
    entity_type: 'application',
    entity_id: 'app-1',
    title: 'Application moved to Interview',
    detail: 'Your application for the SWE role was advanced.',
    timestamp: '2026-04-05T10:00:00Z',
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

const emptyUserContextValue = {
  ...userContextValue,
  user: { id: 'u1', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com' } as never,
};

function renderPage(
  ctxOverrides: Partial<typeof userContextValue> = {},
  setToolbarHeader = vi.fn(),
) {
  return render(
    <ToolbarHeaderContext.Provider value={setToolbarHeader}>
      <UserContext.Provider value={{ ...userContextValue, ...ctxOverrides }}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </UserContext.Provider>
    </ToolbarHeaderContext.Provider>,
  );
}

/* ── Tests ────────────────────────────────────────────────────────── */

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-04-09T09:00:00'));
    mockedGetCommandCenterSummary.mockReset();
    mockedGetActivityFeed.mockReset();
    mockedGetActionItems.mockReset();
    mockedGetLeads.mockReset();

    // localStorage is used by the component for persisting collapsed state
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders loading skeleton while data is being fetched', () => {
    // Services never resolve, so loading stays true
    mockedGetCommandCenterSummary.mockReturnValue(new Promise(() => {}));
    mockedGetActivityFeed.mockReturnValue(new Promise(() => {}));
    mockedGetActionItems.mockReturnValue(new Promise(() => {}));
    mockedGetLeads.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByLabelText('Loading dashboard')).toBeInTheDocument();
  });

  it('sets the toolbar header to the greeting and long date', async () => {
    mockedGetCommandCenterSummary.mockResolvedValue(makeSummary() as never);
    mockedGetActivityFeed.mockResolvedValue({ items: [], total: 0 } as never);
    mockedGetActionItems.mockResolvedValue([] as never);
    mockedGetLeads.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 5 } as never);

    const setToolbarHeader = vi.fn();

    renderPage({}, setToolbarHeader);

    await waitFor(() => {
      expect(setToolbarHeader).toHaveBeenCalledWith({
        title: 'Good morning, Jane',
        subtitle: undefined,
      });
    });
  });

  it('renders action items when data loads', async () => {
    mockedGetCommandCenterSummary.mockResolvedValue(makeSummary() as never);
    mockedGetActivityFeed.mockResolvedValue({
      items: [makeFeedItem()],
      total: 1,
    } as never);
    mockedGetActionItems.mockResolvedValue([
      makeActionItem(),
      makeActionItem({ id: 'ai-2', title: 'Prepare resume for Meta', kind: 'prepare_document', priority: 'medium' }),
    ] as never);
    mockedGetLeads.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 5 } as never);

    renderPage();

    expect(await screen.findByText('Follow up with Google recruiter')).toBeInTheDocument();
    expect(screen.getByText('Prepare resume for Meta')).toBeInTheDocument();
  });

  it('renders activity feed when data loads', async () => {
    mockedGetCommandCenterSummary.mockResolvedValue(makeSummary() as never);
    mockedGetActivityFeed.mockResolvedValue({
      items: [
        makeFeedItem(),
        makeFeedItem({ entity_id: 'conn-2', title: 'New connection accepted', type: 'connection' }),
      ],
      total: 2,
    } as never);
    mockedGetActionItems.mockResolvedValue([] as never);
    mockedGetLeads.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 5 } as never);

    renderPage();

    expect(await screen.findByText('Application moved to Interview')).toBeInTheDocument();
    expect(screen.getByText('New connection accepted')).toBeInTheDocument();
  });

  it('renders the pipeline analytics card from the summary response', async () => {
    mockedGetCommandCenterSummary.mockResolvedValue(makeSummary({
      avg_days_per_stage: [
        { stage: 'applied', avg_days: 4.5, sample_size: 6 },
        { stage: 'interview', avg_days: 7, sample_size: 2 },
      ],
      offer_conversion_funnel: [
        { stage: 'applied', reached_count: 12, conversion_from_applied: 100 },
        { stage: 'screening', reached_count: 8, conversion_from_previous: 66.7, conversion_from_applied: 66.7 },
        { stage: 'interview', reached_count: 4, conversion_from_previous: 50, conversion_from_applied: 33.3 },
        { stage: 'offer', reached_count: 2, conversion_from_previous: 50, conversion_from_applied: 16.7 },
      ],
    }) as never);
    mockedGetActivityFeed.mockResolvedValue({ items: [], total: 0 } as never);
    mockedGetActionItems.mockResolvedValue([] as never);
    mockedGetLeads.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 5 } as never);

    renderPage();

    expect(await screen.findByText('PIPELINE ANALYTICS')).toBeInTheDocument();
    expect(screen.getByText('Offer yield 16.7%')).toBeInTheDocument();
    expect(screen.getByText('Slowest stage Interview · 7 days')).toBeInTheDocument();
    expect(screen.getByText('4.5 days')).toBeInTheDocument();
    expect(screen.getByText('2 recorded spans')).toBeInTheDocument();
    expect(screen.getByText('50% from Interview · 16.7% from Applied')).toBeInTheDocument();
  });

  it('renders empty state when there are no action items', async () => {
    mockedGetCommandCenterSummary.mockResolvedValue(makeSummary() as never);
    mockedGetActivityFeed.mockResolvedValue({ items: [], total: 0 } as never);
    mockedGetActionItems.mockResolvedValue([] as never);
    mockedGetLeads.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 5 } as never);

    renderPage();

    expect(await screen.findByText('All clear')).toBeInTheDocument();
  });

  it('renders quick-start cards for new users with no leads or applications', async () => {
    mockedGetCommandCenterSummary.mockResolvedValue(
      makeSummary({ application_count: 0, lead_count: 0 }) as never,
    );
    mockedGetActivityFeed.mockResolvedValue({ items: [], total: 0 } as never);
    mockedGetActionItems.mockResolvedValue([] as never);
    mockedGetLeads.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 5 } as never);

    renderPage();

    expect(await screen.findByText('Welcome to Baldin')).toBeInTheDocument();
    expect(screen.getByText('Import a Lead')).toBeInTheDocument();
    expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
    expect(screen.getByText('Discover People')).toBeInTheDocument();
    expect(screen.getByText('Create a Document')).toBeInTheDocument();
  });

  it('renders error state when data fetch fails', async () => {
    mockedGetCommandCenterSummary.mockRejectedValue(new Error('Network error'));
    mockedGetActivityFeed.mockRejectedValue(new Error('Network error'));
    mockedGetActionItems.mockRejectedValue(new Error('Network error'));
    mockedGetLeads.mockRejectedValue(new Error('Network error'));

    renderPage();

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
