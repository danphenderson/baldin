import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { requestDocumentCollaborationBootstrap } from '../service/documents';
import {
  resolveCollaborationBootstrapRetryDelay,
  seedCollaborationDocument,
} from './collaboration-bootstrap';
import {
  buildCollaborationSocketConfig,
  useCollaborativeEditor,
  type ConnectionStatus,
} from './use-collaborative-editor';

const websocketProviderMock = vi.fn();

vi.mock('y-websocket', () => ({
  WebsocketProvider: function MockWebsocketProvider(...args: unknown[]) {
    return websocketProviderMock(...args);
  },
}));

vi.mock('../service/documents', () => ({
  requestDocumentCollaborationBootstrap: vi.fn(),
}));

vi.mock('./collaboration-bootstrap', () => ({
  resolveCollaborationBootstrapRetryDelay: vi.fn((retryAfterMs?: number | null) => retryAfterMs ?? 0),
  seedCollaborationDocument: vi.fn(),
}));

function createProviderDouble() {
  return {
    on: vi.fn(),
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
    vi.clearAllMocks();
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
      params: { collaboration_token: 'collab-token-123' },
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

    expect(result.current.connectionStatus).toBe('disconnected');

    await waitFor(() => {
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
});
