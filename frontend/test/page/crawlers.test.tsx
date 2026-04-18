import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UserContext } from '@/context/user-context';
import { ToolbarHeaderContext } from '@/layout/toolbar-header-context';

vi.mock('@/service/crawlers', () => ({
  getCrawlerPipelines: vi.fn(),
  createCrawlerPipeline: vi.fn(),
  updateCrawlerPipeline: vi.fn(),
  getCrawlerRuns: vi.fn(),
  triggerCrawlerRun: vi.fn(),
  cancelCrawlerRun: vi.fn(),
  pauseCrawlerRun: vi.fn(),
  resumeCrawlerRun: vi.fn(),
  retryCrawlerRun: vi.fn(),
}));

import * as crawlerService from '@/service/crawlers';
import CrawlersPage from '@/page/crawlers';

const mockedGetCrawlerPipelines = vi.mocked(crawlerService.getCrawlerPipelines);
const mockedGetCrawlerRuns = vi.mocked(crawlerService.getCrawlerRuns);

const userContextValue = {
  user: { id: 'u1', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com' } as never,
  setUser: vi.fn(),
  token: 'test-token',
  setToken: vi.fn(),
  loading: false,
  canAccessTier: vi.fn(() => true),
};

function makePipeline(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'pipe-1',
    name: 'LinkedIn Pipeline',
    description: 'Monitor new backend roles',
    source: 'linkedin',
    query_definition: { keywords: ['backend'] },
    schedule_definition: null,
    enabled: true,
    execution_policy: null,
    extraction_policy: null,
    requires_approval: false,
    created_by_user_id: 'user-1',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    last_run_status: 'pending',
    last_run_at: '2026-04-07T00:00:00Z',
    run_count: 12,
    ...overrides,
  };
}

function makeRun(id: string, errorSummary?: string) {
  return {
    id,
    crawler_pipeline_id: 'pipe-1',
    trigger_type: 'manual',
    status: 'pending',
    scheduled_for: null,
    started_at: null,
    finished_at: null,
    stats: null,
    error_summary: errorSummary ?? null,
    retry_of_id: null,
    created_at: '2026-04-07T00:00:00Z',
    updated_at: '2026-04-07T00:00:00Z',
  };
}

function renderPage() {
  return render(
    <ToolbarHeaderContext.Provider value={vi.fn()}>
      <UserContext.Provider value={userContextValue}>
        <MemoryRouter>
          <CrawlersPage />
        </MemoryRouter>
      </UserContext.Provider>
    </ToolbarHeaderContext.Provider>,
  );
}

describe('CrawlersPage', () => {
  beforeEach(() => {
    mockedGetCrawlerPipelines.mockReset();
    mockedGetCrawlerRuns.mockReset();

    mockedGetCrawlerPipelines.mockResolvedValue([makePipeline()] as never);
    mockedGetCrawlerRuns.mockImplementation(async (_token, params) => {
      if (params?.page === 2) {
        return {
          items: [makeRun('run-11', 'page-two-run')],
          total: 12,
          page: 2,
          page_size: 10,
        } as never;
      }

      return {
        items: [
          makeRun('run-1', 'page-one-run'),
          ...Array.from({ length: 9 }, (_, index) => makeRun(`run-${index + 2}`)),
        ],
        total: 12,
        page: 1,
        page_size: 10,
      } as never;
    });
  });

  it('loads paginated run history and requests the next page from the API', async () => {
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByText('LinkedIn Pipeline')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Expand runs'));

    await waitFor(() => {
      expect(mockedGetCrawlerRuns).toHaveBeenCalledWith('test-token', {
        pipeline_id: 'pipe-1',
        page: 1,
        page_size: 10,
      });
    });
    expect(await screen.findByText('page-one-run')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Go to next page'));

    await waitFor(() => {
      expect(mockedGetCrawlerRuns).toHaveBeenLastCalledWith('test-token', {
        pipeline_id: 'pipe-1',
        page: 2,
        page_size: 10,
      });
    });
    expect(await screen.findByText('page-two-run')).toBeInTheDocument();
  });
});
