import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MessagingServiceError,
  getUnreadCount,
} from '@/service/messages';

describe('messages service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('requests the unread badge count from the api v1 endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ total_unread: 7 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await getUnreadCount('token-123');

    expect(result.total_unread).toBe(7);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/conversations/unread');
    expect(options.method).toBe('GET');
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer token-123');
  });

  it('surfaces a typed error when the unread request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(
      new Response(JSON.stringify({ detail: 'No conversation access.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    )));

    const error = await getUnreadCount('token-123').catch((value) => value);

    expect(error).toBeInstanceOf(MessagingServiceError);
    expect(error).toMatchObject({
      status: 403,
      message: 'No conversation access.',
    });
  });
});
