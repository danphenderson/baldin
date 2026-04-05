import { components } from '../schema';
import { API_URL } from '../config/env';

export type UserDirectoryRead = components['schemas']['UserDirectoryRead'];
export type UserDirectoryPaginatedRead = components['schemas']['UserDirectoryPaginatedRead'];
export type UserPublicProfileRead = components['schemas']['UserPublicProfileRead'];

type DirectoryErrorDetail = unknown;

const BASE_URL = `${API_URL}/directory`;

export class DirectoryServiceError extends Error {
  status: number;

  detail: DirectoryErrorDetail;

  constructor(message: string, status: number, detail: DirectoryErrorDetail) {
    super(message);
    this.name = 'DirectoryServiceError';
    this.status = status;
    this.detail = detail;
  }
}

export const isDirectoryServiceError = (error: unknown): error is DirectoryServiceError => (
  error instanceof DirectoryServiceError
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

const parseError = async (response: Response): Promise<DirectoryServiceError> => {
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

  const fallback = response.status === 403
    ? 'You do not have permission to browse the directory.'
    : response.status === 404
      ? 'That user profile could not be found.'
      : 'Directory request failed.';

  return new DirectoryServiceError(stringifyDetail(detail, fallback), response.status, detail);
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

export const getDirectoryUsers = async (
  token: string,
  params?: { q?: string; placement_status?: string; location?: string; page?: number; page_size?: number },
): Promise<UserDirectoryPaginatedRead> => {
  const requestOptions = buildRequest(token, 'GET');
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.placement_status) query.set('placement_status', params.placement_status);
  if (params?.location) query.set('location', params.location);
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.page_size !== undefined) query.set('page_size', String(params.page_size));
  const suffix = query.toString() ? `/?${query.toString()}` : '/';
  return fetchAPI<UserDirectoryPaginatedRead>(`${BASE_URL}${suffix}`, requestOptions);
};

export const getDirectoryProfile = async (
  token: string,
  userId: string,
): Promise<UserPublicProfileRead> => {
  const requestOptions = buildRequest(token, 'GET');
  return fetchAPI<UserPublicProfileRead>(`${BASE_URL}/${userId}`, requestOptions);
};
