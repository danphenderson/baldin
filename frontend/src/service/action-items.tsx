import { components } from '../schema';
import { API_URL } from '../config/env';

export type ActionItemRead = components['schemas']['ActionItemRead'];
export type ActionItemDetailRead = components['schemas']['ActionItemDetailRead'];
export type ActionItemCreate = components['schemas']['ActionItemCreate'];
export type ActionItemUpdate = components['schemas']['ActionItemUpdate'];

const BASE_URL = `${API_URL}/action-items`;

const createRequestOptions = (token: string, method: string, body?: unknown): RequestInit => {
  if (!token) {
    throw new Error('Authorization token is required');
  }

  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : null,
  };
};

const fetchAPI = async (url: string, options: RequestInit) => {
  const response = await fetch(url, options);

  if (!response.ok) {
    let message = `API request failed for ${url}: ${response.status} ${response.statusText}`;
    try {
      const data = await response.json();
      if (data?.detail) {
        message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // Keep the default message when the error response is not JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204 || response.status === 205) {
    return null;
  }

  return response.json();
};

export const getActionItems = async (
  token: string,
  params?: {
    status?: string;
    kind?: string;
    priority?: string;
    due_before?: string;
    due_after?: string;
    page?: number;
    page_size?: number;
    request_count?: boolean;
  },
): Promise<ActionItemDetailRead[]> => {
  const requestOptions = createRequestOptions(token, 'GET');
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.kind) query.set('kind', params.kind);
  if (params?.priority) query.set('priority', params.priority);
  if (params?.due_before) query.set('due_before', params.due_before);
  if (params?.due_after) query.set('due_after', params.due_after);
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.page_size !== undefined) query.set('page_size', String(params.page_size));
  if (params?.request_count !== undefined) query.set('request_count', String(params.request_count));
  const suffix = query.toString() ? `/?${query.toString()}` : '/';
  return fetchAPI(`${BASE_URL}${suffix}`, requestOptions);
};

export const createActionItem = async (
  token: string,
  payload: ActionItemCreate,
): Promise<ActionItemRead> => {
  const requestOptions = createRequestOptions(token, 'POST', payload);
  return fetchAPI(`${BASE_URL}/`, requestOptions);
};

export const getActionItem = async (
  token: string,
  id: string,
): Promise<ActionItemDetailRead> => {
  const requestOptions = createRequestOptions(token, 'GET');
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
};

export const updateActionItem = async (
  token: string,
  id: string,
  payload: ActionItemUpdate,
): Promise<ActionItemRead> => {
  const requestOptions = createRequestOptions(token, 'PATCH', payload);
  return fetchAPI(`${BASE_URL}/${id}`, requestOptions);
};

export const deleteActionItem = async (
  token: string,
  id: string,
): Promise<void> => {
  const requestOptions = createRequestOptions(token, 'DELETE');
  await fetchAPI(`${BASE_URL}/${id}`, requestOptions);
};

export const reorderActionItems = async (
  token: string,
  itemIds: string[],
): Promise<void> => {
  const requestOptions = createRequestOptions(token, 'POST', { item_ids: itemIds });
  await fetchAPI(`${BASE_URL}/reorder`, requestOptions);
};

export const createActionItemFromApplication = async (
  token: string,
  applicationId: string,
): Promise<ActionItemRead> => {
  const requestOptions = createRequestOptions(token, 'POST');
  return fetchAPI(`${BASE_URL}/from-application/${applicationId}`, requestOptions);
};
