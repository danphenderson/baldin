import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getDocumentActivity,
  getDocumentShareCandidates,
  requestDocumentCollaborationBootstrap,
} from './documents';

describe('documents service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the document-specific share candidates endpoint with the regenerated query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([
        {
          id: 'user-1',
          full_name: 'Alice Zhang',
          email: 'alice@example.com',
          headline: null,
          avatar_uri: null,
        },
      ]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await getDocumentShareCandidates('token-123', 'doc-1', { q: 'alice', limit: 5 });

    expect(result[0]?.full_name).toBe('Alice Zhang');
    const [requestUrl, requestOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toContain('/documents/doc-1/share-candidates?q=alice&limit=5');
    expect(requestOptions.method).toBe('GET');
    expect(requestOptions.headers).toMatchObject({ Authorization: 'Bearer token-123' });
  });

  it('calls the document activity endpoint and returns the activity payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([
        {
          id: 'activity-1',
          created_at: '2026-04-05T12:00:00Z',
          updated_at: '2026-04-05T12:00:00Z',
          document_id: 'doc-1',
          activity_type: 'share_created',
          message: 'Shared with Alice Zhang',
          details: { role: 'editor' },
          actor_user_id: 'user-2',
          actor_full_name: 'Morgan Lee',
          actor_email: 'morgan@example.com',
        },
      ]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await getDocumentActivity('token-123', 'doc-1', { limit: 12 });

    expect(result[0]?.activity_type).toBe('share_created');
    const [requestUrl, requestOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toContain('/documents/doc-1/activity?limit=12');
    expect(requestOptions.method).toBe('GET');
    expect(requestOptions.headers).toMatchObject({ Authorization: 'Bearer token-123' });
  });

  it('claims collaboration bootstrap state from the document route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        status: 'seed',
        retry_after_ms: null,
        content: '{"type":"doc"}',
        content_format: 'tiptap_json',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await requestDocumentCollaborationBootstrap('token-123', 'doc-1');

    expect(result.status).toBe('seed');
    const [requestUrl, requestOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toContain('/documents/doc-1/collaborate/bootstrap?token=token-123');
    expect(requestOptions.method).toBe('POST');
    expect(requestOptions.headers).toMatchObject({ Authorization: 'Bearer token-123' });
  });
});
