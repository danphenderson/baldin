import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NotificationProvider } from '@/context/notification-context';
import { ToolbarHeaderContext } from '@/layout/toolbar-header-context';
import { createInMemoryAdapter } from '@/service/aspirations';
import type { AspirationAdapter } from '@/service/aspirations';
import AspirationsCollection from '@/component/aspirations-collection';
import { Badge as RolesIcon } from '@mui/icons-material';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function renderCollection(
  adapter: AspirationAdapter,
  kind: 'role' | 'company' = 'role',
) {
  return render(
    <ToolbarHeaderContext.Provider value={vi.fn()}>
      <NotificationProvider>
        <MemoryRouter initialEntries={[`/me/aspirations/${kind === 'role' ? 'roles' : 'companies'}`]}>
          <AspirationsCollection
            kind={kind}
            adapter={adapter}
            kindLabel={kind === 'role' ? 'Role' : 'Company'}
            kindIcon={<RolesIcon />}
            emptyTitle={`No ${kind} aspirations yet`}
            emptyDescription={`Track your ${kind} aspirations.`}
          />
        </MemoryRouter>
      </NotificationProvider>
    </ToolbarHeaderContext.Provider>,
  );
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('AspirationsCollection', () => {
  it('renders the empty state when there are no items', async () => {
    const adapter = createInMemoryAdapter();
    renderCollection(adapter);

    await waitFor(() => {
      expect(screen.getByText('No role aspirations yet')).toBeInTheDocument();
    });
    expect(screen.getByText('Track your role aspirations.')).toBeInTheDocument();
  });

  it('renders cards when the adapter has seeded items', async () => {
    const adapter = createInMemoryAdapter();
    await adapter.create('role', { label: 'Frontend Engineer' });
    await adapter.create('role', { label: 'Staff Engineer', reason: 'Growth path' });

    renderCollection(adapter);

    await waitFor(() => {
      expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    });
    expect(screen.getByText('Staff Engineer')).toBeInTheDocument();
    expect(screen.getByText('Growth path')).toBeInTheDocument();
  });

  it('creates a new item via the form dialog', async () => {
    const user = userEvent.setup();
    const adapter = createInMemoryAdapter();
    renderCollection(adapter);

    // Wait for empty state, then click the Add action
    await waitFor(() => {
      expect(screen.getByText('No role aspirations yet')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Add Role/i });
    await user.click(addButton);

    // Fill the form
    const labelInput = screen.getByPlaceholderText('Enter role name');
    await user.type(labelInput, 'Platform Engineer');

    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

    // Card should appear
    await waitFor(() => {
      expect(screen.getByText('Platform Engineer')).toBeInTheDocument();
    });
  });

  it('edits an existing item', async () => {
    const user = userEvent.setup();
    const adapter = createInMemoryAdapter();
    await adapter.create('role', { label: 'Engineer' });

    renderCollection(adapter);

    await waitFor(() => {
      expect(screen.getByText('Engineer')).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /Edit Engineer/i });
    await user.click(editButton);

    const labelInput = screen.getByDisplayValue('Engineer');
    await user.clear(labelInput);
    await user.type(labelInput, 'Senior Engineer');

    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Senior Engineer')).toBeInTheDocument();
    });
  });

  it('deletes an item with confirmation', async () => {
    const user = userEvent.setup();
    const adapter = createInMemoryAdapter();
    await adapter.create('role', { label: 'To Remove' });

    renderCollection(adapter);

    await waitFor(() => {
      expect(screen.getByText('To Remove')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /Delete To Remove/i });
    await user.click(deleteButton);

    // Confirm dialog
    expect(screen.getByText(/Are you sure you want to remove "To Remove"/)).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByText('To Remove')).not.toBeInTheDocument();
    });
  });

  it('uses route-specific labels for the Company kind', async () => {
    const adapter = createInMemoryAdapter();
    renderCollection(adapter, 'company');

    await waitFor(() => {
      expect(screen.getByText('No company aspirations yet')).toBeInTheDocument();
    });
    expect(screen.getByText('Track your company aspirations.')).toBeInTheDocument();
  });

  it('filters items by search text', async () => {
    const user = userEvent.setup();
    const adapter = createInMemoryAdapter();
    await adapter.create('role', { label: 'Frontend Engineer' });
    await adapter.create('role', { label: 'Backend Developer' });

    renderCollection(adapter);

    await waitFor(() => {
      expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search role/i);
    await user.type(searchInput, 'Backend');

    await waitFor(() => {
      expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Backend Developer')).toBeInTheDocument();
  });

  it('shows cross-navigation tabs', async () => {
    const adapter = createInMemoryAdapter();
    renderCollection(adapter, 'role');

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Roles' })).toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: 'Companies' })).toBeInTheDocument();
  });
});
