import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NotificationProvider } from '@/context/notification-context';
import { ToolbarHeaderContext } from '@/layout/toolbar-header-context';
import SuggestionReviewPanel from '@/component/suggestion-review-panel';
import {
  AspirationServiceError,
  type AspirationAdapter,
  type AspirationSuggestionDraft,
} from '@/service/aspirations';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildAdapter(overrides: Partial<AspirationAdapter> = {}): AspirationAdapter {
  return {
    list: vi.fn().mockResolvedValue([]),
    suggest: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({
      id: crypto.randomUUID(),
      kind: 'role',
      label: 'Created',
      reason: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    update: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  };
}

const MOCK_SUGGESTIONS: AspirationSuggestionDraft[] = [
  { kind: 'role', label: 'Staff Product Designer', reason: 'Profile alignment', notes: 'Strong fit', priority: 1 },
  { kind: 'role', label: 'Design Systems Lead', reason: 'Systems thinking', priority: 2 },
];

function renderPanel(adapter: AspirationAdapter, onAccepted = vi.fn()) {
  return render(
    <ToolbarHeaderContext.Provider value={vi.fn()}>
      <NotificationProvider>
        <MemoryRouter>
          <SuggestionReviewPanel
            kind="role"
            kindLabel="Role"
            adapter={adapter}
            onAccepted={onAccepted}
          />
        </MemoryRouter>
      </NotificationProvider>
    </ToolbarHeaderContext.Provider>,
  );
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('SuggestionReviewPanel', () => {
  it('renders the suggest trigger button before any fetch', () => {
    const adapter = buildAdapter();
    renderPanel(adapter);
    expect(screen.getByRole('button', { name: /Suggest from profile/i })).toBeInTheDocument();
  });

  it('shows loading state during suggestion fetch', async () => {
    const user = userEvent.setup();
    const adapter = buildAdapter({
      suggest: vi.fn().mockReturnValue(new Promise(() => {})), // never resolves
    });
    renderPanel(adapter);

    await user.click(screen.getByRole('button', { name: /Suggest from profile/i }));
    expect(screen.getByText('Loading suggestions…')).toBeInTheDocument();
  });

  it('renders suggestion cards after successful fetch', async () => {
    const user = userEvent.setup();
    const adapter = buildAdapter({
      suggest: vi.fn().mockResolvedValue(MOCK_SUGGESTIONS),
    });
    renderPanel(adapter);

    await user.click(screen.getByRole('button', { name: /Suggest from profile/i }));

    await waitFor(() => {
      expect(screen.getByText('Staff Product Designer')).toBeInTheDocument();
    });
    expect(screen.getByText('Design Systems Lead')).toBeInTheDocument();
    expect(screen.getByText('2 suggestions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept all/i })).toBeInTheDocument();
  });

  it('accepts a single suggestion and removes it from drafts', async () => {
    const user = userEvent.setup();
    const onAccepted = vi.fn();
    const adapter = buildAdapter({
      suggest: vi.fn().mockResolvedValue(MOCK_SUGGESTIONS),
      create: vi.fn().mockResolvedValue({
        id: 'new-1', kind: 'role', label: 'Staff Product Designer',
        reason: null, notes: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }),
    });
    renderPanel(adapter, onAccepted);

    await user.click(screen.getByRole('button', { name: /Suggest from profile/i }));
    await waitFor(() => expect(screen.getByText('Staff Product Designer')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Accept Staff Product Designer/i }));

    await waitFor(() => {
      expect(screen.queryByText('Staff Product Designer')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Design Systems Lead')).toBeInTheDocument();
    expect(onAccepted).toHaveBeenCalled();
  });

  it('handles duplicate on accept-one: removes draft and shows feedback', async () => {
    const user = userEvent.setup();
    const onAccepted = vi.fn();
    const adapter = buildAdapter({
      suggest: vi.fn().mockResolvedValue(MOCK_SUGGESTIONS),
      create: vi.fn().mockRejectedValue(new AspirationServiceError('duplicate', 'Already exists')),
    });
    renderPanel(adapter, onAccepted);

    await user.click(screen.getByRole('button', { name: /Suggest from profile/i }));
    await waitFor(() => expect(screen.getByText('Staff Product Designer')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Accept Staff Product Designer/i }));

    await waitFor(() => {
      expect(screen.queryByText('Staff Product Designer')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    expect(onAccepted).toHaveBeenCalled();
  });

  it('discards a suggestion without persisting', async () => {
    const user = userEvent.setup();
    const adapter = buildAdapter({
      suggest: vi.fn().mockResolvedValue(MOCK_SUGGESTIONS),
    });
    renderPanel(adapter);

    await user.click(screen.getByRole('button', { name: /Suggest from profile/i }));
    await waitFor(() => expect(screen.getByText('Staff Product Designer')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Discard Staff Product Designer/i }));

    expect(screen.queryByText('Staff Product Designer')).not.toBeInTheDocument();
    expect(screen.getByText('Design Systems Lead')).toBeInTheDocument();
    expect(adapter.create).not.toHaveBeenCalled();
  });

  it('shows no-signal guidance when suggest returns no_signal', async () => {
    const user = userEvent.setup();
    const adapter = buildAdapter({
      suggest: vi.fn().mockRejectedValue(new AspirationServiceError('no_signal', 'No usable profile data')),
    });
    renderPanel(adapter);

    await user.click(screen.getByRole('button', { name: /Suggest from profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/No strong role signals found/i)).toBeInTheDocument();
    });
  });

  it('shows rate-limited feedback and keeps drafts intact', async () => {
    const user = userEvent.setup();
    const adapter = buildAdapter({
      suggest: vi.fn().mockRejectedValue(new AspirationServiceError('rate_limited', 'Rate limited')),
    });
    renderPanel(adapter);

    await user.click(screen.getByRole('button', { name: /Suggest from profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/temporarily rate limited/i)).toBeInTheDocument();
    });
  });

  it('shows AI-disabled guidance without implying profile edits help', async () => {
    const user = userEvent.setup();
    const adapter = buildAdapter({
      suggest: vi.fn().mockRejectedValue(new AspirationServiceError('ai_disabled', 'Service unavailable')),
    });
    renderPanel(adapter);

    await user.click(screen.getByRole('button', { name: /Suggest from profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/AI-powered suggestions are currently unavailable/i)).toBeInTheDocument();
    });
  });

  it('accept-all processes all suggestions and shows completion summary', async () => {
    const user = userEvent.setup();
    const onAccepted = vi.fn();
    let callCount = 0;
    const adapter = buildAdapter({
      suggest: vi.fn().mockResolvedValue(MOCK_SUGGESTIONS),
      create: vi.fn().mockImplementation(async () => {
        callCount += 1;
        return {
          id: `new-${callCount}`, kind: 'role', label: `Created ${callCount}`,
          reason: null, notes: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        };
      }),
    });
    renderPanel(adapter, onAccepted);

    await user.click(screen.getByRole('button', { name: /Suggest from profile/i }));
    await waitFor(() => expect(screen.getByText('Staff Product Designer')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Accept all/i }));

    await waitFor(() => {
      expect(screen.getByText(/2 roles added/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/All suggestions processed/i)).toBeInTheDocument();
    expect(onAccepted).toHaveBeenCalled();
  });

  it('accept-all stops on first retryable failure and shows partial summary', async () => {
    const user = userEvent.setup();
    const onAccepted = vi.fn();
    let callCount = 0;
    const adapter = buildAdapter({
      suggest: vi.fn().mockResolvedValue(MOCK_SUGGESTIONS),
      create: vi.fn().mockImplementation(async () => {
        callCount += 1;
        if (callCount === 2) {
          throw new AspirationServiceError('rate_limited', 'Rate limit exceeded');
        }
        return {
          id: `new-${callCount}`, kind: 'role', label: `Created ${callCount}`,
          reason: null, notes: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        };
      }),
    });
    renderPanel(adapter, onAccepted);

    await user.click(screen.getByRole('button', { name: /Suggest from profile/i }));
    await waitFor(() => expect(screen.getByText('Staff Product Designer')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Accept all/i }));

    await waitFor(() => {
      expect(screen.getByText(/1 added/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/1 remaining/i)).toBeInTheDocument();
    // The second suggestion should still be visible
    expect(screen.getByText('Design Systems Lead')).toBeInTheDocument();
    expect(onAccepted).toHaveBeenCalled();
  });

  it('accept-all treats duplicates as non-fatal and removes them from drafts', async () => {
    const user = userEvent.setup();
    const onAccepted = vi.fn();
    let callCount = 0;
    const adapter = buildAdapter({
      suggest: vi.fn().mockResolvedValue(MOCK_SUGGESTIONS),
      create: vi.fn().mockImplementation(async () => {
        callCount += 1;
        if (callCount === 1) {
          throw new AspirationServiceError('duplicate', 'Already exists');
        }
        return {
          id: `new-${callCount}`, kind: 'role', label: `Created ${callCount}`,
          reason: null, notes: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        };
      }),
    });
    renderPanel(adapter, onAccepted);

    await user.click(screen.getByRole('button', { name: /Suggest from profile/i }));
    await waitFor(() => expect(screen.getByText('Staff Product Designer')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Accept all/i }));

    await waitFor(() => {
      expect(screen.getByText(/1 already existed/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/1 role added/i)).toBeInTheDocument();
    expect(screen.getByText(/All suggestions processed/i)).toBeInTheDocument();
    expect(onAccepted).toHaveBeenCalled();
  });
});
