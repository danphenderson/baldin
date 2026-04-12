import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createChatSession,
  deleteChatSession,
  getAvailableModels,
  getChatMessages,
  getChatSession,
  getChatSessions,
  saveChatToDocument,
  sendChatMessage,
  updateChatSession,
} from './agent-chat';

const jsonResponse = (body: unknown, status = 200): Response => new Response(
  body === null ? null : JSON.stringify(body),
  {
    status,
    headers: body === null ? undefined : { 'Content-Type': 'application/json' },
  },
);

const streamResponse = (chunks: string[], init?: ResponseInit): Response => {
  const encoder = new TextEncoder();

  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  }), {
    status: 201,
    headers: { 'Content-Type': 'text/event-stream' },
    ...init,
  });
};

describe('agent chat service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates chat sessions through the generated agent chat route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      id: 'session-1',
      created_at: '2026-04-11T12:00:00Z',
      updated_at: '2026-04-11T12:00:00Z',
      agent_id: 'agent-1',
      title: 'Acme intro',
      model_name: 'gpt-5.4-mini',
      status: 'active',
      message_count: 0,
      last_message_at: null,
      application_id: 'app-1',
      user_id: 'user-1',
      messages: [],
    }, 201));

    vi.stubGlobal('fetch', fetchMock);

    const payload = { application_id: 'app-1', title: 'Acme intro' } as const;
    const result = await createChatSession('token-123', 'agent-1', payload);

    expect(result.id).toBe('session-1');
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain('/api/v1/agents/agent-1/chat');
    expect(request.method).toBe('POST');
    expect(request.headers.get('Authorization')).toBe('Bearer token-123');
    expect(await request.json()).toEqual(payload);
  });

  it('lists chat sessions with default pagination and normalized response shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      items: [
        {
          id: 'session-1',
          created_at: '2026-04-11T12:00:00Z',
          updated_at: '2026-04-11T12:05:00Z',
          agent_id: 'agent-1',
          title: 'Acme intro',
          model_name: 'gpt-5.4-mini',
          status: 'active',
          message_count: 2,
          last_message_at: '2026-04-11T12:05:00Z',
          application_id: 'app-1',
        },
      ],
      total: 1,
    }));

    vi.stubGlobal('fetch', fetchMock);

    const result = await getChatSessions('token-123', 'agent-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('session-1');
    expect(result.page).toBe(1);
    expect(result.page_size).toBe(20);
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain('/api/v1/agents/agent-1/chat');
    expect(request.url).toContain('page=1');
    expect(request.url).toContain('page_size=20');
  });

  it('gets a single chat session with the requested limit and embedded messages intact', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      id: 'session-1',
      created_at: '2026-04-11T12:00:00Z',
      updated_at: '2026-04-11T12:05:00Z',
      agent_id: 'agent-1',
      title: 'Acme intro',
      model_name: 'gpt-5.4-mini',
      status: 'active',
      message_count: 2,
      last_message_at: '2026-04-11T12:05:00Z',
      application_id: 'app-1',
      user_id: 'user-1',
      messages: [
        {
          id: 'message-1',
          role: 'user',
          content: 'Hello',
          created_at: '2026-04-11T12:00:00Z',
        },
        {
          id: 'message-2',
          role: 'assistant',
          content: 'Hi there',
          created_at: '2026-04-11T12:00:01Z',
        },
      ],
    }));

    vi.stubGlobal('fetch', fetchMock);

    const result = await getChatSession('token-123', 'session-1', 10);

    expect(result.messages?.map((message) => message.id)).toEqual(['message-1', 'message-2']);
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain('/api/v1/agents/chat/session-1');
    expect(request.url).toContain('limit=10');
  });

  it('lists chat messages with default pagination while preserving backend ordering', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      items: [
        {
          id: 'message-1',
          role: 'user',
          content: 'First',
          created_at: '2026-04-11T12:00:00Z',
        },
        {
          id: 'message-2',
          role: 'assistant',
          content: 'Second',
          created_at: '2026-04-11T12:00:01Z',
        },
      ],
      total: 2,
    }));

    vi.stubGlobal('fetch', fetchMock);

    const result = await getChatMessages('token-123', 'session-1');

    expect(result.items.map((message) => message.id)).toEqual(['message-1', 'message-2']);
    expect(result.page).toBe(1);
    expect(result.page_size).toBe(50);
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain('/api/v1/agents/chat/session-1/messages');
    expect(request.url).toContain('page=1');
    expect(request.url).toContain('page_size=50');
  });

  it('passes through optional tail-pagination params for chat history callers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      items: [
        {
          id: 'message-51',
          role: 'user',
          content: 'Older page item',
          created_at: '2026-04-11T11:59:00Z',
        },
      ],
      total: 51,
    }));

    vi.stubGlobal('fetch', fetchMock);

    await getChatMessages('token-123', 'session-1', {
      page: 2,
      page_size: 50,
      from_tail: true,
    });

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toContain('/api/v1/agents/chat/session-1/messages');
    expect(request.url).toContain('page=2');
    expect(request.url).toContain('page_size=50');
    expect(request.url).toContain('from_tail=true');
  });

  it('updates sessions, saves documents, resolves deletes, and lists available models', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        id: 'session-1',
        created_at: '2026-04-11T12:00:00Z',
        updated_at: '2026-04-11T12:08:00Z',
        agent_id: 'agent-1',
        title: 'Retitled session',
        model_name: 'gpt-5.4',
        status: 'archived',
        message_count: 4,
        last_message_at: '2026-04-11T12:08:00Z',
        application_id: 'app-1',
        user_id: 'user-1',
        messages: [],
      }))
      .mockResolvedValueOnce(jsonResponse({
        document_id: 'doc-1',
        version_id: 'version-1',
      }, 201))
      .mockResolvedValueOnce(jsonResponse(null, 204))
      .mockResolvedValueOnce(jsonResponse({
        default_model_name: 'gpt-5.4',
        default_model_label: 'GPT-5.4',
        models: [
          { name: 'gpt-5.4', label: 'GPT-5.4' },
          { name: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' },
        ],
      }));

    vi.stubGlobal('fetch', fetchMock);

    const updated = await updateChatSession('token-123', 'session-1', {
      title: 'Retitled session',
      status: 'archived',
    });
    const saved = await saveChatToDocument('token-123', 'session-1', {
      title: 'Saved transcript',
    });
    await expect(deleteChatSession('token-123', 'session-1')).resolves.toBeUndefined();
    const models = await getAvailableModels('token-123');

    expect(updated.status).toBe('archived');
    expect(saved.document_id).toBe('doc-1');
    expect(saved.version_id).toBe('version-1');
    expect(models.default_model_name).toBe('gpt-5.4');
    expect(models.default_model_label).toBe('GPT-5.4');
    expect(models.models?.map((model) => model.name)).toEqual(['gpt-5.4', 'gpt-5.4-mini']);

    const patchRequest = fetchMock.mock.calls[0][0] as Request;
    expect(patchRequest.url).toContain('/api/v1/agents/chat/session-1');
    expect(patchRequest.method).toBe('PATCH');
    expect(await patchRequest.json()).toEqual({
      title: 'Retitled session',
      status: 'archived',
    });

    const saveRequest = fetchMock.mock.calls[1][0] as Request;
    expect(saveRequest.url).toContain('/api/v1/agents/chat/session-1/save-to-document');
    expect(saveRequest.method).toBe('POST');
    expect(await saveRequest.json()).toEqual({
      title: 'Saved transcript',
    });

    const deleteRequest = fetchMock.mock.calls[2][0] as Request;
    expect(deleteRequest.method).toBe('DELETE');

    const modelsRequest = fetchMock.mock.calls[3][0] as Request;
    expect(modelsRequest.url).toContain('/api/v1/agents/models');
    expect(modelsRequest.method).toBe('GET');
  });

  it('surfaces backend detail for non-streaming API failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      detail: 'Chat session title conflicts with an existing draft.',
    }, 409)));

    await expect(createChatSession('token-123', 'agent-1', { title: 'Conflict' }))
      .rejects
      .toThrow('Chat session title conflicts with an existing draft.');
  });

  it('parses streaming delta and done events across arbitrary chunk boundaries', async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse([
      'event: delta\r\n',
      'data: {"content":"Hel',
      'lo"}\r\n\r\n',
      'event: delta\r\n',
      'data: {"content":" world"}\r\n\r\n',
      'event: done\r\n',
      'data: {"message":{"id":"message-3","role":"assistant","content":"Hello world","created_at":"2026-04-11T12:00:02Z"}}\r\n\r\n',
    ]));

    vi.stubGlobal('fetch', fetchMock);

    const onDelta = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    sendChatMessage('token-123', 'session-1', 'Hello', onDelta, onDone, onError);

    await vi.waitFor(() => {
      expect(onDone).toHaveBeenCalledTimes(1);
    });

    expect(onDelta.mock.calls.map(([value]) => value)).toEqual(['Hello', ' world']);
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({
      id: 'message-3',
      content: 'Hello world',
    }));
    expect(onError).not.toHaveBeenCalled();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/agents/chat/session-1/messages');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-123');
    expect((init.headers as Record<string, string>).Accept).toBe('text/event-stream');
    expect(init.body).toBe(JSON.stringify({ content: 'Hello' }));
  });

  it('surfaces backend stream error events after prior deltas without calling done', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamResponse([
      'event: delta\n',
      'data: {"content":"Partial"}\n\n',
      'event: error\n',
      'data: {"detail":"Model execution failed"}\n\n',
    ])));

    const onDelta = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    sendChatMessage('token-123', 'session-1', 'Hello', onDelta, onDone, onError);

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Model execution failed');
    });

    expect(onDelta).toHaveBeenCalledWith('Partial');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('reports parsed backend detail for non-2xx streaming responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      detail: 'The selected session is archived.',
    }, 409)));

    const onDone = vi.fn();
    const onError = vi.fn();

    sendChatMessage('token-123', 'session-1', 'Hello', vi.fn(), onDone, onError);

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith('The selected session is archived.');
    });

    expect(onDone).not.toHaveBeenCalled();
  });

  it('treats caller abort as silent cancellation', async () => {
    const fetchMock = vi.fn().mockImplementation((_: string, init?: RequestInit) => new Promise<Response>((_, reject) => {
      const signal = init?.signal;
      signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    }));

    vi.stubGlobal('fetch', fetchMock);

    const onDone = vi.fn();
    const onError = vi.fn();

    const controller = sendChatMessage('token-123', 'session-1', 'Hello', vi.fn(), onDone, onError);
    controller.abort();

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(onDone).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports premature EOF when the stream closes without a done event', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamResponse([
      'event: delta\n',
      'data: {"content":"Partial"}\n\n',
    ])));

    const onDone = vi.fn();
    const onError = vi.fn();

    sendChatMessage('token-123', 'session-1', 'Hello', vi.fn(), onDone, onError);

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Chat stream ended before completion');
    });

    expect(onDone).not.toHaveBeenCalled();
  });
});
