import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { requestDocumentCollaborationBootstrap } from '@/service/documents';
import {
  resolveCollaborationBootstrapRetryDelay,
  seedCollaborationDocument,
} from '@/component/collaboration-bootstrap';
import {
  buildCollaborationSocketConfig,
  useCollaborativeEditor,
} from '@/component/use-collaborative-editor';

const COLLABORATION_WEBSOCKET_PROTOCOL = 'baldin-collaboration';
const websocketProviderMock = vi.fn();
const consoleWarnMock = vi.fn();

vi.mock('y-websocket', () => ({
  WebsocketProvider: function MockWebsocketProvider(...args: unknown[]) {
    return websocketProviderMock(...args);
  },
}));

vi.mock('@/service/documents', () => ({
  requestDocumentCollaborationBootstrap: vi.fn(),
}));

vi.mock('@/component/collaboration-bootstrap', () => ({
  resolveCollaborationBootstrapRetryDelay: vi.fn((retryAfterMs?: number | null) => retryAfterMs ?? 0),
  seedCollaborationDocument: vi.fn(),
}));

function createProviderDouble() {
  return {
    on: vi.fn(),
    off: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    destroy: vi.fn(),
    awareness: {
      setLocalStateField: vi.fn(),
      getStates: vi.fn(() => new Map()),
      on: vi.fn(),
      off: vi.fn(),
    },
  };
}

describe('buildCollaborationSocketConfig', () => {
  it('maps https API origins onto the backend collaboration route expected by y-websocket', () => {
    expect(buildCollaborationSocketConfig('https://api.example.com', 'doc-1')).toEqual({
      serverUrl: 'wss://api.example.com/documents/doc-1',
      roomName: 'collaborate',
    });
  });

  it('preserves local http development origins and trims trailing slashes', () => {
    expect(buildCollaborationSocketConfig('http://localhost:8004/', 'doc-2')).toEqual({
      serverUrl: 'ws://localhost:8004/documents/doc-2',
      roomName: 'collaborate',
    });
  });
});

describe('useCollaborativeEditor', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.spyOn(console, 'warn').mockImplementation(consoleWarnMock);
    consoleWarnMock.mockReset();
    websocketProviderMock.mockReset();
    vi.mocked(requestDocumentCollaborationBootstrap).mockReset();
    vi.mocked(resolveCollaborationBootstrapRetryDelay).mockReset();
    vi.mocked(resolveCollaborationBootstrapRetryDelay).mockImplementation(
      (retryAfterMs?: number | null) => retryAfterMs ?? 0,
    );
    vi.mocked(seedCollaborationDocument).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('sets connecting status while bootstrapping the realtime session', async () => {
    const providerDouble = createProviderDouble();
    websocketProviderMock.mockReturnValue(providerDouble);

    let resolveBootstrap:
      | ((value: {
        status: 'connect';
        collaboration_token: string;
        retry_after_ms: null;
        content: null;
        content_format: null;
      }) => void)
      | null = null;

    vi.mocked(requestDocumentCollaborationBootstrap).mockReturnValue(
      new Promise(resolve => {
        resolveBootstrap = resolve;
      }),
    );

    const { result } = renderHook(() => useCollaborativeEditor({
      documentId: 'doc-connecting',
      token: 'token-connecting',
      enabled: true,
      userName: 'Taylor',
    }));

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connecting');
    });

    await act(async () => {
      resolveBootstrap?.({
        status: 'connect',
        collaboration_token: 'collab-token-connecting',
        retry_after_ms: null,
        content: null,
        content_format: null,
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(websocketProviderMock).toHaveBeenCalledTimes(1);
      expect(providerDouble.connect).toHaveBeenCalledTimes(1);
    });
  });

  it('claims bootstrap state before opening the websocket provider', async () => {
    const providerDouble = createProviderDouble();
    websocketProviderMock.mockReturnValue(providerDouble);
    vi.mocked(requestDocumentCollaborationBootstrap).mockResolvedValue({
      status: 'seed',
      collaboration_token: 'collab-token-123',
      retry_after_ms: null,
      content: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Seeded once' }] }],
      }),
      content_format: 'tiptap_json',
    });

    renderHook(() => useCollaborativeEditor({
      documentId: 'doc-1',
      token: 'token-123',
      enabled: true,
      userName: 'Taylor',
    }));

    await waitFor(() => {
      expect(requestDocumentCollaborationBootstrap).toHaveBeenCalledWith('token-123', 'doc-1');
      expect(seedCollaborationDocument).toHaveBeenCalledTimes(1);
      expect(websocketProviderMock).toHaveBeenCalledTimes(1);
    });

    expect(providerDouble.connect).toHaveBeenCalledTimes(1);
    expect(websocketProviderMock.mock.calls[0]?.[3]).toMatchObject({
      protocols: [COLLABORATION_WEBSOCKET_PROTOCOL, 'collab-token-123'],
      connect: false,
    });
  });

  it('waits for a pending bootstrap claim to resolve before opening the websocket provider', async () => {
    const providerDouble = createProviderDouble();
    websocketProviderMock.mockReturnValue(providerDouble);

    let resolveSecondBootstrap:
      | ((value: {
        status: 'seed';
        collaboration_token: string;
        retry_after_ms: null;
        content: string;
        content_format: 'tiptap_json';
      }) => void)
      | null = null;
    const secondBootstrap = new Promise<{
      status: 'seed';
      collaboration_token: string;
      retry_after_ms: null;
      content: string;
      content_format: 'tiptap_json';
    }>(resolve => {
      resolveSecondBootstrap = resolve;
    });

    vi.mocked(requestDocumentCollaborationBootstrap)
      .mockResolvedValueOnce({
        status: 'pending',
        collaboration_token: 'collab-token-123',
        retry_after_ms: 250,
        content: null,
        content_format: null,
      })
      .mockReturnValueOnce(secondBootstrap);

    renderHook(() => useCollaborativeEditor({
      documentId: 'doc-1',
      token: 'token-123',
      enabled: true,
      userName: 'Taylor',
    }));

    await waitFor(() => {
      expect(requestDocumentCollaborationBootstrap).toHaveBeenCalledTimes(2);
    });

    expect(resolveCollaborationBootstrapRetryDelay).toHaveBeenCalledWith(250, 0);
    expect(websocketProviderMock).not.toHaveBeenCalled();

    await act(async () => {
      resolveSecondBootstrap?.({
        status: 'seed',
        collaboration_token: 'collab-token-123',
        retry_after_ms: null,
        content: JSON.stringify({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Retry then seed' }] }],
        }),
        content_format: 'tiptap_json',
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(websocketProviderMock).toHaveBeenCalledTimes(1);
    });

    expect(seedCollaborationDocument).toHaveBeenCalledTimes(1);
    expect(providerDouble.connect).toHaveBeenCalledTimes(1);
  });

  it('exposes connectionStatus that tracks provider status events', async () => {
    const providerDouble = createProviderDouble();
    websocketProviderMock.mockReturnValue(providerDouble);
    vi.mocked(requestDocumentCollaborationBootstrap).mockResolvedValue({
      status: 'connect',
      collaboration_token: 'collab-token-123',
      retry_after_ms: null,
      content: null,
      content_format: null,
    });

    const { result } = renderHook(() => useCollaborativeEditor({
      documentId: 'doc-status',
      token: 'tok',
      enabled: true,
      userName: 'Sam',
    }));

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connecting');
      expect(providerDouble.on).toHaveBeenCalledWith('status', expect.any(Function));
    });

    const statusHandler = providerDouble.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'status',
    )?.[1] as ((event: { status: string }) => void) | undefined;
    expect(statusHandler).toBeDefined();

    act(() => { statusHandler!({ status: 'connecting' }); });
    expect(result.current.connectionStatus).toBe('connecting');

    act(() => { statusHandler!({ status: 'connected' }); });
    expect(result.current.connectionStatus).toBe('connected');
    expect(result.current.connected).toBe(true);

    act(() => { statusHandler!({ status: 'disconnected' }); });
    expect(result.current.connectionStatus).toBe('disconnected');
    expect(result.current.connected).toBe(false);
  });

  it('returns disconnected status when disabled', () => {
    const { result } = renderHook(() => useCollaborativeEditor({
      documentId: 'doc-disabled',
      token: 'tok',
      enabled: false,
    }));

    expect(result.current.connectionStatus).toBe('disconnected');
    expect(result.current.connected).toBe(false);
  });

  it('returns to disconnected when bootstrap resolution fails', async () => {
    vi.mocked(requestDocumentCollaborationBootstrap).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useCollaborativeEditor({
      documentId: 'doc-error',
      token: 'token-error',
      enabled: true,
      userName: 'Jordan',
    }));

    await waitFor(() => {
      expect(requestDocumentCollaborationBootstrap).toHaveBeenCalledWith('token-error', 'doc-error');
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.connected).toBe(false);
    });

    expect(websocketProviderMock).not.toHaveBeenCalled();
  });

  it('continues to connect when seed hydration fails locally', async () => {
    const providerDouble = createProviderDouble();
    websocketProviderMock.mockReturnValue(providerDouble);
    vi.mocked(seedCollaborationDocument).mockReturnValue(false);
    vi.mocked(requestDocumentCollaborationBootstrap).mockResolvedValue({
      status: 'seed',
      collaboration_token: 'collab-token-seed-fail',
      retry_after_ms: null,
      content: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Seed me' }] }],
      }),
      content_format: 'tiptap_json',
    });

    renderHook(() => useCollaborativeEditor({
      documentId: 'doc-seed-fail',
      token: 'token-seed-fail',
      enabled: true,
      userName: 'Avery',
    }));

    await waitFor(() => {
      expect(seedCollaborationDocument).toHaveBeenCalledTimes(1);
      expect(providerDouble.connect).toHaveBeenCalledTimes(1);
    });

    expect(consoleWarnMock).toHaveBeenCalledWith(
      'Failed to seed collaboration state from saved TipTap JSON; continuing with live connection.',
    );
  });

  it('forwards seedExtensions to seedCollaborationDocument when bootstrapping', async () => {
    const providerDouble = createProviderDouble();
    websocketProviderMock.mockReturnValue(providerDouble);
    vi.mocked(requestDocumentCollaborationBootstrap).mockResolvedValue({
      status: 'seed',
      collaboration_token: 'collab-token-ext',
      retry_after_ms: null,
      content: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'With extensions' }] }],
      }),
      content_format: 'tiptap_json',
    });

    const fakeSeedExtensions = [{ name: 'test-extension' }] as unknown as import('@tiptap/core').Extensions;

    renderHook(() => useCollaborativeEditor({
      documentId: 'doc-ext',
      token: 'token-ext',
      enabled: true,
      userName: 'Quinn',
      seedExtensions: fakeSeedExtensions,
    }));

    await waitFor(() => {
      expect(seedCollaborationDocument).toHaveBeenCalledTimes(1);
    });

    const seedCall = vi.mocked(seedCollaborationDocument).mock.calls[0];
    expect(seedCall?.[2]).toBe(fakeSeedExtensions);
  });

  it('cleans up provider listeners and instances when the target document changes', async () => {
    const firstProvider = createProviderDouble();
    const secondProvider = createProviderDouble();
    websocketProviderMock
      .mockReturnValueOnce(firstProvider)
      .mockReturnValueOnce(secondProvider);
    vi.mocked(requestDocumentCollaborationBootstrap).mockResolvedValue({
      status: 'connect',
      collaboration_token: 'collab-token-cleanup',
      retry_after_ms: null,
      content: null,
      content_format: null,
    });

    const { rerender } = renderHook(
      (props: { documentId: string }) => useCollaborativeEditor({
        documentId: props.documentId,
        token: 'token-cleanup',
        enabled: true,
        userName: 'Morgan',
      }),
      { initialProps: { documentId: 'doc-cleanup-1' } },
    );

    await waitFor(() => {
      expect(firstProvider.connect).toHaveBeenCalledTimes(1);
    });

    rerender({ documentId: 'doc-cleanup-2' });

    await waitFor(() => {
      expect(firstProvider.awareness.off).toHaveBeenCalledWith('change', expect.any(Function));
      expect(firstProvider.off).toHaveBeenCalledWith('status', expect.any(Function));
      expect(firstProvider.disconnect).toHaveBeenCalledTimes(1);
      expect(firstProvider.destroy).toHaveBeenCalledTimes(1);
      expect(secondProvider.connect).toHaveBeenCalledTimes(1);
    });
  });
});
