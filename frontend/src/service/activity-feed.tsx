import { components } from '../schema';
import { API_URL } from '../config/env';

export type ActivityFeedItem = components['schemas']['ActivityFeedItem'];
export type ActivityFeedRead = components['schemas']['ActivityFeedRead'];
export type CommandCenterSummary = components['schemas']['CommandCenterSummary'];

const BASE_URL = `${API_URL}/activity-feed`;

const createRequestOptions = (token: string, method: string): RequestInit => {
  if (!token) {
    throw new Error('Authorization token is required');
  }

  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
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

export const getActivityFeed = async (
  token: string,
  params?: {
    page?: number;
    page_size?: number;
    since?: string;
    entity_type?: string;
  },
): Promise<ActivityFeedRead> => {
  const requestOptions = createRequestOptions(token, 'GET');
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.page_size !== undefined) query.set('page_size', String(params.page_size));
  if (params?.since) query.set('since', params.since);
  if (params?.entity_type) query.set('entity_type', params.entity_type);
  const suffix = query.toString() ? `/?${query.toString()}` : '/';
  return fetchAPI(`${BASE_URL}${suffix}`, requestOptions);
};

export const getCommandCenterSummary = async (
  token: string,
): Promise<CommandCenterSummary> => {
  const requestOptions = createRequestOptions(token, 'GET');
  return fetchAPI(`${BASE_URL}/summary`, requestOptions);
};
