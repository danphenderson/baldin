import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NotificationProvider } from '@/context/notification-context';
import { UserContext } from '@/context/user-context';
import { ToolbarHeaderContext } from '@/layout/toolbar-header-context';

vi.mock('@/service/db-management', () => ({
  DB_MANAGEMENT_PURGE_DOMAINS: [
    'profile',
    'leads',
    'applications',
    'documents',
    'agents',
    'extractors',
    'orchestration',
  ],
  getDbManagementStatus: vi.fn(),
  getDbManagementTables: vi.fn(),
  getDbManagementTable: vi.fn(),
  getDbManagementUsers: vi.fn(),
  previewUserCleanup: vi.fn(),
  purgeUserData: vi.fn(),
  deleteUser: vi.fn(),
  isDbManagementServiceError: vi.fn(() => false),
}));

import * as dbManagementService from '@/service/db-management';
import DbManagementPage from '@/page/db-management';

const mockedGetDbManagementStatus = vi.mocked(dbManagementService.getDbManagementStatus);
const mockedGetDbManagementTables = vi.mocked(dbManagementService.getDbManagementTables);
const mockedGetDbManagementTable = vi.mocked(dbManagementService.getDbManagementTable);
const mockedGetDbManagementUsers = vi.mocked(dbManagementService.getDbManagementUsers);
const mockedPreviewUserCleanup = vi.mocked(dbManagementService.previewUserCleanup);
const mockedPurgeUserData = vi.mocked(dbManagementService.purgeUserData);
const mockedDeleteUser = vi.mocked(dbManagementService.deleteUser);

const userContextValue = {
  user: { id: 'admin-1', first_name: 'Jane', is_superuser: true } as never,
  setUser: vi.fn(),
  token: 'test-token',
  setToken: vi.fn(),
  loading: false,
  canAccessTier: vi.fn(() => true),
};

const defaultUser = {
  user_id: 'user-1',
  email: 'alice@example.com',
  display_name: 'Alice Example',
  is_active: true,
  is_superuser: false,
  is_discoverable: true,
  created_at: '2026-04-12T00:00:00Z',
};

function renderPage() {
  return render(
    <NotificationProvider>
      <ToolbarHeaderContext.Provider value={vi.fn()}>
        <UserContext.Provider value={userContextValue}>
          <MemoryRouter>
            <DbManagementPage />
          </MemoryRouter>
        </UserContext.Provider>
      </ToolbarHeaderContext.Provider>
    </NotificationProvider>,
  );
}

describe('DbManagementPage', () => {
  beforeEach(() => {
    mockedGetDbManagementStatus.mockReset();
    mockedGetDbManagementTables.mockReset();
    mockedGetDbManagementTable.mockReset();
    mockedGetDbManagementUsers.mockReset();
    mockedPreviewUserCleanup.mockReset();
    mockedPurgeUserData.mockReset();
    mockedDeleteUser.mockReset();

    mockedGetDbManagementStatus.mockResolvedValue({
      current_revision: 'abc123',
      head_revision: 'abc123',
      is_at_head: true,
      public_table_count: 12,
    } as never);

    mockedGetDbManagementTables.mockResolvedValue([
      { table_name: 'users', column_count: 18, row_count: 3 },
      { table_name: 'documents', column_count: 12, row_count: 9 },
    ] as never);

    mockedGetDbManagementTable.mockResolvedValue({
      table_name: 'users',
      row_count: 3,
      columns: [
        { name: 'id', data_type: 'uuid', is_nullable: false, default: null },
        { name: 'email', data_type: 'varchar', is_nullable: false, default: null },
      ],
    } as never);

    mockedGetDbManagementUsers.mockResolvedValue({
      items: [defaultUser],
      total: 1,
      page: 1,
      page_size: 10,
    } as never);

    mockedPreviewUserCleanup.mockImplementation(async (_token, _userId, domains) => {
      if (!domains || domains.length === 0) {
        return {
          user_id: 'user-1',
          domains: ['profile', 'leads', 'applications', 'documents', 'agents', 'extractors', 'orchestration'],
          cleared_profile_fields: 3,
          deleted_records: { documents: 4, skills: 1 },
          delete_allowed: false,
          delete_block_reason: 'self_delete',
          purge_allowed: false,
          purge_block_reason: 'self_delete',
        } as never;
      }

      return {
        user_id: 'user-1',
        domains,
        cleared_profile_fields: 3,
        deleted_records: { skills: 1 },
        delete_allowed: false,
        delete_block_reason: 'self_delete',
        purge_allowed: true,
        purge_block_reason: null,
      } as never;
    });

    mockedPurgeUserData.mockResolvedValue({
      user_id: 'user-1',
      user_deleted: false,
      domains: ['profile'],
      cleared_profile_fields: 3,
      deleted_records: { skills: 1 },
    } as never);

    mockedDeleteUser.mockResolvedValue({
      user_id: 'user-1',
      user_deleted: true,
      domains: ['profile', 'leads'],
      cleared_profile_fields: 0,
      deleted_records: { skills: 1 },
    } as never);
  });

  it('loads overview, tables, and users, then fetches a cleanup preview for the selected user', async () => {
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByText('DB Management')).toBeInTheDocument();
    expect(await screen.findByText('users')).toBeInTheDocument();
    expect(await screen.findByText('Alice Example')).toBeInTheDocument();

    await user.click(screen.getByText('users'));
    await user.click(screen.getByText('Alice Example'));

    await waitFor(() => {
      expect(mockedGetDbManagementTable).toHaveBeenCalledWith('test-token', 'users');
      expect(mockedPreviewUserCleanup).toHaveBeenCalledWith('test-token', 'user-1', undefined);
    });

    expect(await screen.findByText(/current superuser session/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete User' })).toBeDisabled();
  });

  it('refreshes preview scope when domains change and executes a scoped purge', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(await screen.findByText('Alice Example'));

    await waitFor(() => {
      expect(mockedPreviewUserCleanup).toHaveBeenCalledWith('test-token', 'user-1', undefined);
    });

    await user.click(screen.getByLabelText('Profile'));

    await waitFor(() => {
      expect(mockedPreviewUserCleanup).toHaveBeenLastCalledWith('test-token', 'user-1', ['profile']);
    });

    const purgeButton = await screen.findByRole('button', { name: 'Purge Data' });
    expect(purgeButton).toBeEnabled();

    await user.click(purgeButton);
    await user.click(await screen.findByRole('button', { name: 'Purge data' }));

    await waitFor(() => {
      expect(mockedPurgeUserData).toHaveBeenCalledWith('test-token', 'user-1', ['profile']);
    });
  });

  it('executes a user delete when the preview allows it', async () => {
    const user = userEvent.setup();

    mockedPreviewUserCleanup.mockResolvedValue({
      user_id: 'user-1',
      domains: ['profile', 'documents'],
      cleared_profile_fields: 3,
      deleted_records: { documents: 4 },
      delete_allowed: true,
      delete_block_reason: null,
      purge_allowed: true,
      purge_block_reason: null,
    } as never);

    renderPage();

    await user.click(await screen.findByText('Alice Example'));

    expect(await screen.findByRole('button', { name: 'Delete User' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Delete User' }));
    await user.click(await screen.findByRole('button', { name: 'Delete user' }));

    await waitFor(() => {
      expect(mockedDeleteUser).toHaveBeenCalledWith('test-token', 'user-1');
    });
  });
});
