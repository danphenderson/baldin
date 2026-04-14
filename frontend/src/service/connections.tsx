import { components } from '../schema';
import { API_URL } from '../config/env';
import {
  fetchAllPages,
  FULL_LIST_PAGE_SIZE,
  normalizePaginatedResponse,
  type PaginatedResponse,
} from './pagination';

export type ConnectionRead = components['schemas']['ConnectionRead'];
export type ConnectionCreate = components['schemas']['ConnectionCreate'];
export type ConnectionsPaginatedRead = PaginatedResponse<ConnectionRead>;
export type ConnectionStatus = components['schemas']['ConnectionStatus'];
export type ConnectionUserSummaryRead =
  components['schemas']['ConnectionUserSummaryRead'];

export interface ConnectionListParams {
  status?: ConnectionStatus;
  page?: number;
  page_size?: number;
}

type ConnectionErrorDetail = unknown;

const BASE_URL = `${API_URL}/connections`;

export class ConnectionServiceError extends Error {
  status: number;

  detail: ConnectionErrorDetail;

  constructor(message: string, status: number, detail: ConnectionErrorDetail) {
    super(message);
    this.name = 'ConnectionServiceError';
    this.status = status;
    this.detail = detail;
  }
}

export const isConnectionServiceError = (
  error: unknown,
): error is ConnectionServiceError => error instanceof ConnectionServiceError;

const buildRequest = (
  token: string,
  method: string,
  body?: unknown,
): RequestInit => {
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
    const maybeMessage = (detail as { message?: unknown; detail?: unknown })
      .message;
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

const parseError = async (
  response: Response,
): Promise<ConnectionServiceError> => {
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

  const fallback =
    response.status === 400
      ? 'The server rejected that connection request.'
      : response.status === 403
        ? 'You do not have permission to do that.'
        : response.status === 404
          ? 'That connection could not be found.'
          : response.status === 409
            ? 'A connection with that user already exists.'
            : 'Connection request failed.';

  return new ConnectionServiceError(
    stringifyDetail(detail, fallback),
    response.status,
    detail,
  );
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

export const getConnections = async (
  token: string,
  params?: ConnectionListParams,
): Promise<ConnectionsPaginatedRead> => {
  const page = params?.page ?? 1;
  const pageSize = params?.page_size ?? 20;
  const requestOptions = buildRequest(token, 'GET');
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  query.set('page', String(page));
  query.set('page_size', String(pageSize));
  const suffix = query.toString() ? `/?${query.toString()}` : '/';
  const response = await fetchAPI<ConnectionsPaginatedRead>(
    `${BASE_URL}${suffix}`,
    requestOptions,
  );
  return normalizePaginatedResponse(response, { page, page_size: pageSize });
};

export const getAllConnections = async (
  token: string,
  params?: Omit<ConnectionListParams, 'page' | 'page_size'>,
): Promise<ConnectionRead[]> =>
  fetchAllPages<ConnectionRead>(
    (page, pageSize) =>
      getConnections(token, {
        ...params,
        page,
        page_size: pageSize,
      }),
    FULL_LIST_PAGE_SIZE,
  );

export const createConnection = async (
  token: string,
  data: ConnectionCreate,
): Promise<ConnectionRead> => {
  const requestOptions = buildRequest(token, 'POST', data);
  return fetchAPI<ConnectionRead>(`${BASE_URL}/`, requestOptions);
};

export const acceptConnection = async (
  token: string,
  id: string,
): Promise<ConnectionRead> => {
  const requestOptions = buildRequest(token, 'PATCH');
  return fetchAPI<ConnectionRead>(`${BASE_URL}/${id}/accept`, requestOptions);
};

export const declineConnection = async (
  token: string,
  id: string,
): Promise<ConnectionRead> => {
  const requestOptions = buildRequest(token, 'PATCH');
  return fetchAPI<ConnectionRead>(`${BASE_URL}/${id}/decline`, requestOptions);
};

export const deleteConnection = async (
  token: string,
  id: string,
): Promise<void> => {
  const requestOptions = buildRequest(token, 'DELETE');
  await fetchAPI<void>(`${BASE_URL}/${id}`, requestOptions);
};

export const blockConnection = async (
  token: string,
  id: string,
): Promise<ConnectionRead> => {
  const requestOptions = buildRequest(token, 'POST');
  return fetchAPI<ConnectionRead>(`${BASE_URL}/${id}/block`, requestOptions);
};
