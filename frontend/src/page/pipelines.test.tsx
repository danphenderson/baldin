import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeProvider from '../theme/theme-provider';
import { UserContext } from '../context/user-context';
import { ToolbarHeaderContext } from '../layout/toolbar-header-context';
import PipelinesPage from './pipelines';

vi.mock('../service/data-orchestration', async () => {
  const actual = await vi.importActual<typeof import('../service/data-orchestration')>('../service/data-orchestration');
  return {
    ...actual,
    getOrchestrationPipelines: vi.fn().mockResolvedValue([]),
    getOrchestrationEvents: vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
    }),
  };
});

const userContextValue = {
  user: {
    id: 'user-1',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@test.com',
    is_superuser: false,
  } as never,
  setUser: vi.fn(),
  token: 'test-token',
  setToken: vi.fn(),
  loading: false,
  canAccessTier: vi.fn(() => true),
};

describe('PipelinesPage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn(() => 'light'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('opens the shared workflow dialog from the page action', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ToolbarHeaderContext.Provider value={vi.fn()}>
          <UserContext.Provider value={userContextValue}>
            <PipelinesPage />
          </UserContext.Provider>
        </ToolbarHeaderContext.Provider>
      </ThemeProvider>,
    );

    await user.click(await screen.findByRole('button', { name: 'New Workflow' }));

    expect(await screen.findByRole('dialog', { name: 'Create Workflow' })).toBeInTheDocument();
  });
});
