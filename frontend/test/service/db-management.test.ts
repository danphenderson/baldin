import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getDbManagementUsers,
  previewUserCleanup,
  purgeUserData,
} from '@/service/db-management';

describe('db-management service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requests paginated users and normalizes the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        items: [
          {
            user_id: 'user-1',
            email: 'alice@example.com',
            display_name: 'Alice Example',
            is_active: true,
            is_superuser: false,
            is_discoverable: true,
            created_at: '2026-04-12T00:00:00Z',
          },
        ],
        total: 1,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const response = await getDbManagementUsers('token-123', {
      q: 'alice',
      is_active: true,
      page: 2,
      page_size: 5,
      request_count: true,
    });

    expect(response).toEqual({
      items: [
        expect.objectContaining({
          user_id: 'user-1',
          email: 'alice@example.com',
        }),
      ],
      total: 1,
      page: 2,
      page_size: 5,
    });

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain('/api/v1/db-management/users');
    expect(request.url).toContain('q=alice');
    expect(request.url).toContain('is_active=true');
    expect(request.url).toContain('page=2');
    expect(request.url).toContain('page_size=5');
    expect(request.url).toContain('request_count=true');
    expect(request.headers.get('Authorization')).toBe('Bearer token-123');
  });

  it('serializes repeated cleanup domains in preview requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        user_id: 'user-1',
        domains: ['profile', 'documents'],
        cleared_profile_fields: 3,
        deleted_records: { documents: 4 },
        delete_allowed: true,
        delete_block_reason: null,
        purge_allowed: true,
        purge_block_reason: null,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await previewUserCleanup('token-123', 'user-1', ['profile', 'documents']);

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain('/api/v1/db-management/users/user-1/cleanup-preview');
    expect(request.url).toContain('domains=profile');
    expect(request.url).toContain('domains=documents');
  });

  it('surfaces blocked purge responses as a typed service error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        detail: 'Superusers cannot fully purge their own account. Use scoped cleanup domains for targeted cleanup.',
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    await expect(purgeUserData('token-123', 'user-1')).rejects.toMatchObject({
      name: 'DbManagementServiceError',
      status: 409,
      message: 'Superusers cannot fully purge their own account. Use scoped cleanup domains for targeted cleanup.',
    });
  });
});
