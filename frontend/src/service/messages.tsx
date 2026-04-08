import { components } from '../schema';
import { API_URL } from '../config/env';

export type ConversationRead = components['schemas']['ConversationRead'];
export type ConversationDetailRead = components['schemas']['ConversationDetailRead'];
export type ConversationsPaginatedRead = components['schemas']['ConversationsPaginatedRead'];
export type ConversationCreate = components['schemas']['ConversationCreate'];
export type ConversationType = components['schemas']['ConversationType'];
export type ConversationParticipantRead = components['schemas']['ConversationParticipantRead'];
export type ConversationParticipantRole = components['schemas']['ConversationParticipantRole'];
export type MessageRead = components['schemas']['MessageRead'];
export type MessageCreate = components['schemas']['MessageCreate'];
export type MessageEdit = components['schemas']['MessageEdit'];
export type MessageAuthorRead = components['schemas']['MessageAuthorRead'];
export type UnreadCountRead = components['schemas']['UnreadCountRead'];

type MessagingErrorDetail = unknown;

const BASE_URL = `${API_URL}/conversations`;

export class MessagingServiceError extends Error {
  status: number;

  detail: MessagingErrorDetail;

  constructor(message: string, status: number, detail: MessagingErrorDetail) {
    super(message);
    this.name = 'MessagingServiceError';
    this.status = status;
    this.detail = detail;
  }
}

export const isMessagingServiceError = (error: unknown): error is MessagingServiceError => (
  error instanceof MessagingServiceError
);

const buildRequest = (token: string, method: string, body?: unknown): RequestInit => {
  if (!token) {
    throw new Error('Authorization token is required');
  }

  const headers = new Headers({
    Authorization: `Bearer ${token}`,
  });

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  return {
    method,
    headers,
    body: body === undefined ? null : JSON.stringify(body),
  };
};

const stringifyDetail = (detail: unknown, fallback: string): string => {
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => stringifyDetail(item, fallback))
      .filter(Boolean)
      .join(' ');
  }

  if (detail && typeof detail === 'object') {
    const maybeMessage = (detail as { message?: unknown; detail?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
      return maybeMessage;
    }

    const nestedDetail = (detail as { detail?: unknown }).detail;
    if (nestedDetail !== undefined) {
      return stringifyDetail(nestedDetail, fallback);
    }

    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }

  return fallback;
};

const parseError = async (response: Response): Promise<MessagingServiceError> => {
  let detail: unknown = null;

  try {
    const text = await response.text();
    if (text) {
      try {
        detail = JSON.parse(text);
      } catch {
        detail = text;
      }
    }
  } catch {
    detail = null;
  }

  const fallback = response.status === 400
    ? 'The server rejected that request.'
    : response.status === 403
      ? 'You do not have permission to do that.'
      : response.status === 404
        ? 'That conversation could not be found.'
        : response.status === 409
          ? 'A conversation with that user already exists.'
          : 'Messaging request failed.';

  return new MessagingServiceError(stringifyDetail(detail, fallback), response.status, detail);
};

const fetchAPI = async <T,>(url: string, options: RequestInit): Promise<T> => {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204 || response.status === 205) {
    return null as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return null as T;
  }

  return response.json() as Promise<T>;
};

export const getConversations = async (
  token: string,
  params?: { page?: number; page_size?: number },
): Promise<ConversationsPaginatedRead> => {
  const requestOptions = buildRequest(token, 'GET');
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.page_size !== undefined) query.set('page_size', String(params.page_size));
  const suffix = query.toString() ? `/?${query.toString()}` : '/';
  return fetchAPI<ConversationsPaginatedRead>(`${BASE_URL}${suffix}`, requestOptions);
};

export const getUnreadCount = async (token: string): Promise<UnreadCountRead> => {
  const requestOptions = buildRequest(token, 'GET');
  return fetchAPI<UnreadCountRead>(`${BASE_URL}/unread`, requestOptions);
};

export const getConversation = async (
  token: string,
  id: string,
  params?: { page?: number; page_size?: number },
): Promise<ConversationDetailRead> => {
  const requestOptions = buildRequest(token, 'GET');
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.page_size !== undefined) query.set('page_size', String(params.page_size));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return fetchAPI<ConversationDetailRead>(`${BASE_URL}/${id}${suffix}`, requestOptions);
};

export const createConversation = async (
  token: string,
  data: ConversationCreate,
): Promise<ConversationRead> => {
  const requestOptions = buildRequest(token, 'POST', data);
  return fetchAPI<ConversationRead>(`${BASE_URL}/`, requestOptions);
};

export const sendMessage = async (
  token: string,
  conversationId: string,
  data: MessageCreate,
): Promise<MessageRead> => {
  const requestOptions = buildRequest(token, 'POST', data);
  return fetchAPI<MessageRead>(`${BASE_URL}/${conversationId}/messages`, requestOptions);
};

export const editMessage = async (
  token: string,
  conversationId: string,
  messageId: string,
  data: MessageEdit,
): Promise<MessageRead> => {
  const requestOptions = buildRequest(token, 'PATCH', data);
  return fetchAPI<MessageRead>(`${BASE_URL}/${conversationId}/messages/${messageId}`, requestOptions);
};

export const deleteMessage = async (
  token: string,
  conversationId: string,
  messageId: string,
): Promise<void> => {
  const requestOptions = buildRequest(token, 'DELETE');
  await fetchAPI<void>(`${BASE_URL}/${conversationId}/messages/${messageId}`, requestOptions);
};

export const markAsRead = async (
  token: string,
  conversationId: string,
): Promise<void> => {
  const requestOptions = buildRequest(token, 'POST');
  await fetchAPI<void>(`${BASE_URL}/${conversationId}/read`, requestOptions);
};

export const addParticipant = async (
  token: string,
  conversationId: string,
  userId: string,
): Promise<void> => {
  const requestOptions = buildRequest(token, 'POST', { user_id: userId });
  await fetchAPI<void>(`${BASE_URL}/${conversationId}/participants`, requestOptions);
};

export const removeParticipant = async (
  token: string,
  conversationId: string,
  userId: string,
): Promise<void> => {
  const requestOptions = buildRequest(token, 'DELETE');
  await fetchAPI<void>(`${BASE_URL}/${conversationId}/participants/${userId}`, requestOptions);
};
