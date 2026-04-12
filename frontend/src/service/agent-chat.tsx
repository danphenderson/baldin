import { API_URL } from '../config/env';
import { components } from '../schema';
import { createApiClient } from './api-client';
import { normalizePaginatedResponse, type PaginatedResponse } from './pagination';

export type AgentChatSessionCreate = components['schemas']['AgentChatSessionCreate'];
export type AgentChatSessionRead = components['schemas']['AgentChatSessionRead'];
export type AgentChatSessionSummaryRead = components['schemas']['AgentChatSessionSummaryRead'];
export type AgentChatSessionUpdate = components['schemas']['AgentChatSessionUpdate'];
export type AgentChatMessageCreate = components['schemas']['AgentChatMessageCreate'];
export type AgentChatMessageRead = components['schemas']['AgentChatMessageRead'];
export type AgentChatMessageRole = components['schemas']['AgentChatMessageRole'];
export type AgentChatSessionStatus = components['schemas']['AgentChatSessionStatus'];
export type AgentModelListRead = components['schemas']['AgentModelListRead'];
export type AgentModelOptionRead = components['schemas']['AgentModelOptionRead'];
export type AgentChatSaveToDocumentRequest = components['schemas']['AgentChatSaveToDocumentRequest'];
export type AgentChatSaveToDocumentRead = components['schemas']['AgentChatSaveToDocumentRead'];
export interface AgentChatMessageHistoryRead {
  has_more_before: boolean;
  next_before: string | null;
}
export interface AgentChatHistoryPageRead {
  items: AgentChatMessageRead[];
  has_more_before: boolean;
  next_before: string | null;
}

type RawAgentChatSessionsPaginatedRead = components['schemas']['PaginatedResponse_AgentChatSessionSummaryRead_'];
type RawAgentChatHistoryPageRead = components['schemas']['AgentChatHistoryPageRead'];

export type AgentChatSessionsPaginatedRead = PaginatedResponse<AgentChatSessionSummaryRead>;

export interface AgentChatSessionsPagination {
  page?: number;
  page_size?: number;
}

export interface AgentChatHistoryPagination {
  before?: string;
  limit?: number;
}

type ChatDeltaHandler = (content: string) => void;
type ChatDoneHandler = (message: AgentChatMessageRead) => void;
type ChatErrorHandler = (message: string) => void;

const DEFAULT_SESSIONS_PAGE = 1;
const DEFAULT_SESSIONS_PAGE_SIZE = 20;
const DEFAULT_SESSION_LIMIT = 50;

const unwrap = <T,>(
  result: { data?: T; error?: unknown; response: Response },
): T => {
  if (result.error !== undefined) {
    const detail = result.error as { detail?: unknown };
    let message = 'API request failed';
    if (detail?.detail) {
      message = typeof detail.detail === 'string' ? detail.detail : JSON.stringify(detail.detail);
    }
    throw new Error(message);
  }
  return result.data as T;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const isAgentChatMessageRole = (value: unknown): value is AgentChatMessageRole => (
  value === 'system' || value === 'user' || value === 'assistant'
);

const isAgentChatMessageRead = (value: unknown): value is AgentChatMessageRead => (
  isRecord(value)
  && typeof value.id === 'string'
  && isAgentChatMessageRole(value.role)
  && typeof value.content === 'string'
  && typeof value.created_at === 'string'
);

const isAbortError = (error: unknown): boolean => (
  error instanceof DOMException
  ? error.name === 'AbortError'
  : error instanceof Error && error.name === 'AbortError'
);

const extractStreamErrorDetail = async (response: Response): Promise<string> => {
  try {
    const text = await response.text();
    if (!text) {
      return 'API request failed';
    }

    const parsed = JSON.parse(text) as { detail?: unknown };
    const detail = parsed?.detail;
    if (typeof detail === 'string' && detail) {
      return detail;
    }
    if (detail !== undefined && detail !== null) {
      return typeof detail === 'string' ? detail : JSON.stringify(detail);
    }
  } catch {
    return 'API request failed';
  }

  return 'API request failed';
};

const parseEventPayload = (eventBlock: string): { eventName: string | null; data: string | null } => {
  let eventName: string | null = null;
  const dataLines: string[] = [];

  for (const line of eventBlock.split('\n')) {
    if (!line) {
      continue;
    }

    if (line.startsWith('event:')) {
      eventName = line.slice('event:'.length).trim();
      continue;
    }

    if (line.startsWith('data:')) {
      let dataLine = line.slice('data:'.length);
      if (dataLine.startsWith(' ')) {
        dataLine = dataLine.slice(1);
      }
      dataLines.push(dataLine);
    }
  }

  return {
    eventName,
    data: dataLines.length > 0 ? dataLines.join('\n') : null,
  };
};

const handleStreamEvent = (
  eventBlock: string,
  onDelta: ChatDeltaHandler,
  onDone: ChatDoneHandler,
  onError: ChatErrorHandler,
): 'continue' | 'stop' => {
  const { eventName, data } = parseEventPayload(eventBlock);

  if (!eventName) {
    return 'continue';
  }

  if (eventName !== 'delta' && eventName !== 'done' && eventName !== 'error') {
    return 'continue';
  }

  if (data === null) {
    onError('Received malformed chat stream event');
    return 'stop';
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    onError('Received malformed chat stream event');
    return 'stop';
  }

  if (!isRecord(parsed)) {
    onError('Received malformed chat stream event');
    return 'stop';
  }

  if (eventName === 'delta') {
    if (typeof parsed.content !== 'string') {
      onError('Received malformed chat stream event');
      return 'stop';
    }

    onDelta(parsed.content);
    return 'continue';
  }

  if (eventName === 'done') {
    if (!isAgentChatMessageRead(parsed.message)) {
      onError('Received malformed chat stream event');
      return 'stop';
    }

    onDone(parsed.message);
    return 'stop';
  }

  const detail = parsed.detail;
  onError(typeof detail === 'string' ? detail : 'Chat stream failed');
  return 'stop';
};

export const createChatSession = async (
  token: string,
  agentId: string,
  payload: AgentChatSessionCreate,
): Promise<AgentChatSessionRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/agents/{id}/chat', {
    params: { path: { id: agentId } },
    body: payload,
  }));
};

export const getChatSessions = async (
  token: string,
  agentId: string,
  pagination?: AgentChatSessionsPagination,
): Promise<AgentChatSessionsPaginatedRead> => {
  const page = pagination?.page ?? DEFAULT_SESSIONS_PAGE;
  const pageSize = pagination?.page_size ?? DEFAULT_SESSIONS_PAGE_SIZE;
  const client = createApiClient(token);
  const response = unwrap<RawAgentChatSessionsPaginatedRead>(await client.GET('/api/v1/agents/{id}/chat', {
    params: {
      path: { id: agentId },
      query: {
        page,
        page_size: pageSize,
      },
    },
  }));

  return normalizePaginatedResponse(response, { page, page_size: pageSize });
};

export const getChatSession = async (
  token: string,
  sessionId: string,
  limit?: number,
): Promise<AgentChatSessionRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/agents/chat/{session_id}', {
    params: {
      path: { session_id: sessionId },
      query: {
        limit: limit ?? DEFAULT_SESSION_LIMIT,
      },
    },
  }));
};

export const getChatHistory = async (
  token: string,
  sessionId: string,
  pagination?: AgentChatHistoryPagination,
): Promise<AgentChatHistoryPageRead> => {
  const client = createApiClient(token);
  const response = unwrap<RawAgentChatHistoryPageRead>(await client.GET('/api/v1/agents/chat/{session_id}/history', {
    params: {
      path: { session_id: sessionId },
      query: {
        before: pagination?.before,
        limit: pagination?.limit ?? DEFAULT_SESSION_LIMIT,
      },
    },
  }));

  return {
    items: response.items ?? [],
    has_more_before: response.has_more_before ?? false,
    next_before: response.next_before ?? null,
  };
};

export const updateChatSession = async (
  token: string,
  sessionId: string,
  payload: AgentChatSessionUpdate,
): Promise<AgentChatSessionRead> => {
  const client = createApiClient(token);
  return unwrap(await client.PATCH('/api/v1/agents/chat/{session_id}', {
    params: { path: { session_id: sessionId } },
    body: payload,
  }));
};

export const deleteChatSession = async (token: string, sessionId: string): Promise<void> => {
  const client = createApiClient(token);
  unwrap(await client.DELETE('/api/v1/agents/chat/{session_id}', {
    params: { path: { session_id: sessionId } },
  }));
};

export const saveChatToDocument = async (
  token: string,
  sessionId: string,
  payload: AgentChatSaveToDocumentRequest,
): Promise<AgentChatSaveToDocumentRead> => {
  const client = createApiClient(token);
  return unwrap(await client.POST('/api/v1/agents/chat/{session_id}/save-to-document', {
    params: { path: { session_id: sessionId } },
    body: payload,
  }));
};

export const getAvailableModels = async (token: string): Promise<AgentModelListRead> => {
  const client = createApiClient(token);
  return unwrap(await client.GET('/api/v1/agents/models'));
};

export const sendChatMessage = (
  token: string,
  sessionId: string,
  content: string,
  onDelta: ChatDeltaHandler,
  onDone: ChatDoneHandler,
  onError: ChatErrorHandler,
): AbortController => {
  const controller = new AbortController();

  void (async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/agents/chat/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ content }),
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      if (!response.ok) {
        onError(await extractStreamErrorDetail(response));
        return;
      }

      if (!response.body) {
        onError('Streaming response body was unavailable');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let isComplete = false;
      let isTerminated = false;

      try {
        while (true) {
          const { value, done } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          buffer = buffer.replace(/\r\n/g, '\n');

          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const eventBlock = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);

            const outcome = handleStreamEvent(eventBlock, onDelta, (message) => {
              isComplete = true;
              onDone(message);
            }, (message) => {
              isTerminated = true;
              onError(message);
            });

            if (controller.signal.aborted) {
              return;
            }

            if (outcome === 'stop') {
              if (isComplete || isTerminated) {
                return;
              }
              return;
            }

            boundary = buffer.indexOf('\n\n');
          }
        }

        buffer += decoder.decode();
        buffer = buffer.replace(/\r\n/g, '\n');

        if (!isComplete && !isTerminated && !controller.signal.aborted) {
          onError('Chat stream ended before completion');
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) {
        return;
      }

      onError(error instanceof Error && error.message ? error.message : 'Chat stream failed');
    }
  })();

  return controller;
};
