import { afterEach, describe, expect, it, vi } from 'vitest';

describe('figma wave1 browser harness messaging mocks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('intercepts api v1 messaging routes used by the dashboard and message screens', async () => {
    const nativeFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'should not hit native fetch' }), {
        status: 418,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', nativeFetch);

    const { installFigmaWave1FetchMock } = await import('@/browser-harness/figma-wave1-mocks');
    const { getConversations, getUnreadCount } = await import('@/service/messages');

    installFigmaWave1FetchMock();

    const [conversations, unread] = await Promise.all([
      getConversations('token-123'),
      getUnreadCount('token-123'),
    ]);

    expect(conversations.items.length).toBeGreaterThan(0);
    expect(unread.total_unread).toBe(4);
    expect(nativeFetch).not.toHaveBeenCalled();
  });
});
