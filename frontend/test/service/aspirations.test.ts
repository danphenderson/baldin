import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createApiAdapter,
  createInMemoryAdapter,
  getAspirations,
  getAspirationSuggestions,
  AspirationServiceError,
  type AspirationSuggestionDraft,
} from '@/service/aspirations';
import type { AspirationAdapter } from '@/service/aspirations';
import { createApiClient } from '@/service/api-client';

vi.mock('@/service/api-client', () => ({
  createApiClient: vi.fn(),
}));

const mockedCreateApiClient = vi.mocked(createApiClient);

describe('createInMemoryAdapter', () => {
  let adapter: AspirationAdapter;

  const setup = () => {
    adapter = createInMemoryAdapter();
  };

  it('returns an empty list for a kind with no items', async () => {
    setup();
    const result = await adapter.list('role');
    expect(result).toEqual([]);
  });

  it('creates items and lists them by kind', async () => {
    setup();
    await adapter.create('role', { label: 'Frontend Engineer' });
    await adapter.create('company', { label: 'Acme Corp' });
    await adapter.create('role', { label: 'Staff Engineer', reason: 'Growth path' });

    const roles = await adapter.list('role');
    expect(roles).toHaveLength(2);
    expect(roles.map((r) => r.label)).toContain('Frontend Engineer');
    expect(roles.map((r) => r.label)).toContain('Staff Engineer');

    const companies = await adapter.list('company');
    expect(companies).toHaveLength(1);
    expect(companies[0]?.label).toBe('Acme Corp');
  });

  it('assigns unique IDs and timestamps on create', async () => {
    setup();
    const a = await adapter.create('role', { label: 'A' });
    const b = await adapter.create('role', { label: 'B' });

    expect(a.id).not.toBe(b.id);
    expect(a.created_at).toBeDefined();
    expect(a.updated_at).toBeDefined();
    expect(a.kind).toBe('role');
  });

  it('preserves optional fields on create', async () => {
    setup();
    const item = await adapter.create('company', {
      label: 'Widgets Inc',
      reason: 'Great culture',
      notes: 'Applied before',
    });

    expect(item.reason).toBe('Great culture');
    expect(item.notes).toBe('Applied before');
  });

  it('updates an existing item', async () => {
    setup();
    const created = await adapter.create('role', { label: 'Engineer' });
    // Small delay so timestamps differ
    await new Promise((r) => setTimeout(r, 5));
    const updated = await adapter.update(created.id, { label: 'Senior Engineer', reason: 'Promotion target' });

    expect(updated.id).toBe(created.id);
    expect(updated.label).toBe('Senior Engineer');
    expect(updated.reason).toBe('Promotion target');
    expect(new Date(updated.updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(created.updated_at).getTime(),
    );
  });

  it('throws on update for a non-existent ID', async () => {
    setup();
    await expect(adapter.update('non-existent', { label: 'Foo' })).rejects.toThrow('not found');
  });

  it('removes an existing item', async () => {
    setup();
    const created = await adapter.create('role', { label: 'To Delete' });
    await adapter.remove(created.id);
    const roles = await adapter.list('role');
    expect(roles).toHaveLength(0);
  });

  it('throws on remove for a non-existent ID', async () => {
    setup();
    await expect(adapter.remove('non-existent')).rejects.toThrow('not found');
  });

  it('returns items sorted newest-first', async () => {
    setup();
    await adapter.create('role', { label: 'First' });
    // Small delay so timestamps differ
    await new Promise((r) => setTimeout(r, 5));
    await adapter.create('role', { label: 'Second' });

    const roles = await adapter.list('role');
    expect(roles[0]?.label).toBe('Second');
    expect(roles[1]?.label).toBe('First');
  });

  it('returns seeded suggestions filtered by kind', async () => {
    adapter = createInMemoryAdapter({
      suggestions: [
        { kind: 'role', label: 'Staff Product Designer', reason: 'Profile title alignment' },
        { kind: 'company', label: 'Northstar', reason: 'Recent employer overlap' },
      ],
    });

    const suggestions = await adapter.suggest('role');

    expect(suggestions).toEqual([
      { kind: 'role', label: 'Staff Product Designer', reason: 'Profile title alignment' },
    ]);
  });

  it('returns an empty suggestion list when no in-memory suggestions are seeded', async () => {
    setup();

    await expect(adapter.suggest('role')).resolves.toEqual([]);
  });
});

describe('createApiAdapter', () => {
  beforeEach(() => {
    mockedCreateApiClient.mockReset();
  });

  it('lists aspirations across paginated responses', async () => {
    const GET = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          items: [{ id: 'a-1', kind: 'role', label: 'Staff Engineer', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' }],
          total: 2,
          page: 1,
          page_size: 500,
        },
        response: new Response(),
      })
      .mockResolvedValueOnce({
        data: {
          items: [{ id: 'a-2', kind: 'role', label: 'Platform Engineer', created_at: '2026-04-02T00:00:00Z', updated_at: '2026-04-02T00:00:00Z' }],
          total: 2,
          page: 2,
          page_size: 500,
        },
        response: new Response(),
      });
    mockedCreateApiClient.mockReturnValue({ GET } as never);

    const items = await getAspirations('test-token', 'role');

    expect(items.map((item) => item.label)).toEqual(['Staff Engineer', 'Platform Engineer']);
    expect(GET).toHaveBeenNthCalledWith(1, '/api/v1/aspirations', {
      params: { query: { kind: 'role', page: 1, page_size: 500 } },
    });
    expect(GET).toHaveBeenNthCalledWith(2, '/api/v1/aspirations', {
      params: { query: { kind: 'role', page: 2, page_size: 500 } },
    });
  });

  it('creates, updates, and removes aspirations through the API adapter', async () => {
    const GET = vi.fn();
    const POST = vi.fn().mockResolvedValue({
      data: { id: 'a-1', kind: 'role', label: 'Staff Engineer', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
      response: new Response(),
    });
    const PATCH = vi.fn().mockResolvedValue({
      data: { id: 'a-1', kind: 'role', label: 'Principal Engineer', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-02T00:00:00Z' },
      response: new Response(),
    });
    const DELETE = vi.fn().mockResolvedValue({ response: new Response() });
    mockedCreateApiClient.mockReturnValue({ GET, POST, PATCH, DELETE } as never);

    const adapter = createApiAdapter('test-token');
    const created = await adapter.create('role', { label: 'Staff Engineer' });
    const updated = await adapter.update('a-1', { label: 'Principal Engineer' });
    await adapter.remove('a-1');

    expect(created.label).toBe('Staff Engineer');
    expect(updated.label).toBe('Principal Engineer');
    expect(POST).toHaveBeenCalledWith('/api/v1/aspirations', {
      body: { kind: 'role', label: 'Staff Engineer' },
    });
    expect(PATCH).toHaveBeenCalledWith('/api/v1/aspirations/{id}', {
      params: { path: { id: 'a-1' } },
      body: { label: 'Principal Engineer' },
    });
    expect(DELETE).toHaveBeenCalledWith('/api/v1/aspirations/{id}', {
      params: { path: { id: 'a-1' } },
    });
  });

  it('loads suggestion drafts and filters them by kind in the API adapter', async () => {
    const suggestions: AspirationSuggestionDraft[] = [
      { kind: 'role', label: 'Staff Product Designer', reason: 'Matches the current profile focus' },
      { kind: 'company', label: 'Northstar', reason: 'Recent shared lead activity' },
    ];
    const POST = vi.fn().mockResolvedValue({
      data: { suggestions },
      response: new Response(),
    });
    mockedCreateApiClient.mockReturnValue({ POST } as never);

    const adapter = createApiAdapter('test-token');
    const result = await adapter.suggest('role');

    expect(result).toEqual([
      { kind: 'role', label: 'Staff Product Designer', reason: 'Matches the current profile focus' },
    ]);
    expect(POST).toHaveBeenCalledWith('/api/v1/aspirations/suggest');
  });
});

describe('getAspirationSuggestions', () => {
  beforeEach(() => {
    mockedCreateApiClient.mockReset();
  });

  it('returns an empty array when the API omits suggestions', async () => {
    const POST = vi.fn().mockResolvedValue({
      data: {},
      response: new Response(),
    });
    mockedCreateApiClient.mockReturnValue({ POST } as never);

    await expect(getAspirationSuggestions('test-token')).resolves.toEqual([]);
  });

  it('returns suggestion drafts from the suggest endpoint', async () => {
    const POST = vi.fn().mockResolvedValue({
      data: {
        suggestions: [
          { kind: 'role', label: 'Principal Product Designer' },
        ],
      },
      response: new Response(),
    });
    mockedCreateApiClient.mockReturnValue({ POST } as never);

    await expect(getAspirationSuggestions('test-token')).resolves.toEqual([
      { kind: 'role', label: 'Principal Product Designer' },
    ]);
  });

  it('classifies a 400 with no-usable-profile detail as no_signal', async () => {
    const POST = vi.fn().mockResolvedValue({
      error: { detail: 'No usable profile data found for suggestion generation.' },
      response: new Response(null, { status: 400 }),
    });
    mockedCreateApiClient.mockReturnValue({ POST } as never);

    await expect(getAspirationSuggestions('test-token')).rejects.toThrow(AspirationServiceError);
    try {
      await getAspirationSuggestions('test-token');
    } catch (e) {
      expect((e as AspirationServiceError).category).toBe('no_signal');
    }
  });

  it('classifies a 400 with unrecognized detail as unknown', async () => {
    const POST = vi.fn().mockResolvedValue({
      error: { detail: 'Some other validation error' },
      response: new Response(null, { status: 400 }),
    });
    mockedCreateApiClient.mockReturnValue({ POST } as never);

    try {
      await getAspirationSuggestions('test-token');
    } catch (e) {
      expect(e).toBeInstanceOf(AspirationServiceError);
      expect((e as AspirationServiceError).category).toBe('unknown');
    }
  });

  it('classifies a 429 as rate_limited', async () => {
    const POST = vi.fn().mockResolvedValue({
      error: { detail: 'Rate limit exceeded' },
      response: new Response(null, { status: 429 }),
    });
    mockedCreateApiClient.mockReturnValue({ POST } as never);

    try {
      await getAspirationSuggestions('test-token');
    } catch (e) {
      expect(e).toBeInstanceOf(AspirationServiceError);
      expect((e as AspirationServiceError).category).toBe('rate_limited');
    }
  });

  it('classifies a 503 as ai_disabled', async () => {
    const POST = vi.fn().mockResolvedValue({
      error: { detail: 'Service unavailable' },
      response: new Response(null, { status: 503 }),
    });
    mockedCreateApiClient.mockReturnValue({ POST } as never);

    try {
      await getAspirationSuggestions('test-token');
    } catch (e) {
      expect(e).toBeInstanceOf(AspirationServiceError);
      expect((e as AspirationServiceError).category).toBe('ai_disabled');
    }
  });

  it('classifies a fetch-level network failure as network', async () => {
    const POST = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    mockedCreateApiClient.mockReturnValue({ POST } as never);

    try {
      await getAspirationSuggestions('test-token');
    } catch (e) {
      expect(e).toBeInstanceOf(AspirationServiceError);
      expect((e as AspirationServiceError).category).toBe('network');
    }
  });
});

describe('API adapter create error classification', () => {
  beforeEach(() => {
    mockedCreateApiClient.mockReset();
  });

  it('classifies a 409 create response as duplicate', async () => {
    const POST = vi.fn().mockResolvedValue({
      error: { detail: 'Aspiration already exists' },
      response: new Response(null, { status: 409 }),
    });
    mockedCreateApiClient.mockReturnValue({ POST } as never);

    const adapter = createApiAdapter('test-token');
    try {
      await adapter.create('role', { label: 'Staff Engineer' });
    } catch (e) {
      expect(e).toBeInstanceOf(AspirationServiceError);
      expect((e as AspirationServiceError).category).toBe('duplicate');
    }
  });

  it('classifies a 429 create response as rate_limited', async () => {
    const POST = vi.fn().mockResolvedValue({
      error: { detail: 'Rate limit exceeded' },
      response: new Response(null, { status: 429 }),
    });
    mockedCreateApiClient.mockReturnValue({ POST } as never);

    const adapter = createApiAdapter('test-token');
    try {
      await adapter.create('role', { label: 'Staff Engineer' });
    } catch (e) {
      expect(e).toBeInstanceOf(AspirationServiceError);
      expect((e as AspirationServiceError).category).toBe('rate_limited');
    }
  });

  it('classifies a 503 create response as ai_disabled', async () => {
    const POST = vi.fn().mockResolvedValue({
      error: { detail: 'Service unavailable' },
      response: new Response(null, { status: 503 }),
    });
    mockedCreateApiClient.mockReturnValue({ POST } as never);

    const adapter = createApiAdapter('test-token');
    try {
      await adapter.create('role', { label: 'Staff Engineer' });
    } catch (e) {
      expect(e).toBeInstanceOf(AspirationServiceError);
      expect((e as AspirationServiceError).category).toBe('ai_disabled');
    }
  });
});
